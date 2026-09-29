"""Validate, upload, promote and verify a CDN artifact. Dry-run is the default."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request


TARGETS = {}
API = 'https://api.scaleway.com/edge-services/v1beta1'
REGION = ''


def configure():
    global TARGETS, REGION
    targets = json.loads(os.environ.get('CDN_TARGETS', '{}'))
    region = os.environ.get('CDN_SCW_REGION', '')
    if not isinstance(targets, dict) or not targets or not re.fullmatch(r'[a-z]{2}-[a-z]{3}', region):
        raise ValueError('Set CDN_TARGETS and CDN_SCW_REGION')
    for bucket, pipeline in targets.items():
        if (not re.fullmatch(r'[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]', bucket)
                or not re.fullmatch(r'[a-f0-9-]{36}', pipeline)):
            raise ValueError('Invalid CDN bucket or pipeline configuration')
    TARGETS, REGION = targets, region


def sha(body):
    return hashlib.sha256(body).hexdigest()


def load_artifact(directory):
    directory = Path(directory).resolve()
    manifest = json.loads((directory / 'manifest.json').read_text())
    version = manifest['version']
    if (manifest['schema'] != 1 or manifest['package'] != '@maveio/components'
            or not re.fullmatch(r'\d+\.\d+\.\d+(?:-[\w.-]+)?', version)):
        raise ValueError('Invalid artifact identity')
    prefix = f'npm/@maveio/components@{version}/'
    seen = set()
    for obj in manifest['objects']:
        key = obj['key']
        if (key in seen or '..' in key.split('/') or '\\' in key
                or not key.startswith((prefix, 'npm/@maveio/components/'))):
            raise ValueError(f'Invalid or duplicate object key: {key}')
        seen.add(key)
        immutable = key.startswith(prefix)
        expected_cache = ('public,max-age=31536000,immutable' if immutable else
                          'public,max-age=60,must-revalidate')
        if (obj['immutable'] != immutable or obj['cacheControl'] != expected_cache
                or obj['contentEncoding'] != 'gzip'):
            raise ValueError(f'Invalid metadata: {key}')
        filename = directory / obj['file']
        if (not re.fullmatch(r'payloads/[a-f0-9]{64}\.gz', obj['file'])
                or filename.resolve().parent != directory / 'payloads'):
            raise ValueError('Invalid payload path')
        body = filename.read_bytes()
        decoded = gzip.decompress(body)
        if (sha(body) != obj['compressedSha256'] or sha(decoded) != obj['sha256']
                or len(body) != obj['compressedBytes'] or len(decoded) != obj['bytes']):
            raise ValueError(f'Corrupt payload: {key}')
    for key in [prefix + '+esm', prefix + 'esm/index.js', 'npm/@maveio/components/+esm']:
        if key not in seen:
            raise ValueError(f'Missing entrypoint: {key}')
    return manifest


class Storage:
    def call(self, *args, missing_ok=False):
        command = ['aws', '--region', REGION, '--endpoint-url',
                   f'https://s3.{REGION}.scw.cloud', 's3api', *args]
        result = subprocess.run(command, capture_output=True, text=True,
                                env={**os.environ, 'AWS_PAGER': ''})
        if result.returncode:
            if missing_ok and re.search(r'\((404|NoSuchKey|NotFound)\)', result.stderr):
                return None
            # Do not print subprocess output: it may include credential diagnostics.
            raise RuntimeError(f'S3 {args[0]} failed (exit {result.returncode})')
        return json.loads(result.stdout or '{}')

    def existing(self, bucket, obj):
        with tempfile.TemporaryDirectory() as temp:
            dest = Path(temp) / 'object'
            meta = self.call('get-object', '--bucket', bucket, '--key', obj['key'],
                             str(dest), missing_ok=True)
            if meta is None:
                return None
            body = dest.read_bytes()
            if meta.get('ContentEncoding') == 'gzip':
                body = gzip.decompress(body)
            return sha(body)

    def put(self, bucket, obj, directory):
        self.call('put-object', '--bucket', bucket, '--key', obj['key'],
                  '--body', str(Path(directory) / obj['file']), '--acl', 'public-read',
                  '--content-type', obj['contentType'], '--content-encoding', 'gzip',
                  '--cache-control', obj['cacheControl'],
                  '--metadata', json.dumps({'sha256': obj['sha256']}))


def api(path, body=None):
    req = urllib.request.Request(API + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'X-Auth-Token': os.environ['SCW_SECRET_KEY'], 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f'Scaleway API returned HTTP {error.code}') from None


def purge(pipeline, assets=None):
    body = {'pipeline_id': pipeline, **({'assets': assets} if assets else {'all': True})}
    result = api('/purge-requests', body)
    deadline = time.monotonic() + 300
    while True:
        target_matches = (result.get('assets') == assets if assets else result.get('all') is True)
        if result.get('pipeline_id') != pipeline or not target_matches:
            raise RuntimeError('Unexpected purge target')
        if result['status'] == 'done':
            return
        if result['status'] not in ('pending', 'unknown_status'):
            raise RuntimeError('Edge purge failed')
        if time.monotonic() >= deadline:
            raise RuntimeError('Edge purge timed out')
        time.sleep(5)
        result = api('/purge-requests/' + result['id'])


def verify(url, obj):
    req = urllib.request.Request(url, headers={'Accept-Encoding': 'gzip', 'Origin': 'https://example.com'})
    with urllib.request.urlopen(req, timeout=30) as response:
        if (response.headers.get('Content-Encoding') != 'gzip'
                or response.headers.get('Content-Type') != obj['contentType']
                or response.headers.get('Cache-Control') != obj['cacheControl']):
            raise RuntimeError(f'Incorrect HTTP metadata: {url}')
        if response.headers.get('Access-Control-Allow-Origin') != '*':
            raise RuntimeError(f'Missing public CORS: {url}')
        if sha(gzip.decompress(response.read())) != obj['sha256']:
            raise RuntimeError(f'Content mismatch: {url}')


def deploy(directory, manifest, tag, storage, purge_fn=purge, verify_fn=verify):
    if not re.fullmatch(r'[a-z][a-z0-9-]*', tag):
        raise ValueError('Invalid release tag')
    if tag == 'latest' and '-' in manifest['version']:
        raise ValueError('A prerelease cannot replace production latest')
    versioned = [obj for obj in manifest['objects'] if obj['immutable']]
    aliases = [obj for obj in manifest['objects'] if not obj['immutable']] if tag == 'latest' else []
    # Check BOTH destinations before writing anything. Never replace the bytes of
    # an existing numbered release, including objects from the old Fly mirror.
    for bucket in TARGETS:
        for obj in versioned:
            previous = storage.existing(bucket, obj)
            if previous is not None and previous != obj['sha256']:
                raise RuntimeError(f'Immutable release conflict: {bucket}/{obj["key"]}')
    # Upload the entire release to both origins, then verify all origin objects.
    for bucket in TARGETS:
        for obj in versioned:
            storage.put(bucket, obj, directory)
        for obj in versioned:
            # Dotted bucket names cannot use the origin's wildcard TLS certificate.
            url = f'https://s3.{REGION}.scw.cloud/{bucket}/' + urllib.parse.quote(obj['key'], safe='/@')
            verify_fn(url, obj)
    # Promote dependent aliases first, main entrypoint last in each bucket.
    aliases.sort(key=lambda obj: obj['key'] == 'npm/@maveio/components/+esm')
    for bucket in TARGETS:
        for obj in aliases:
            storage.put(bucket, obj, directory)
    failures = []
    for bucket, pipeline in TARGETS.items():
        try:
            purge_fn(pipeline)
            # Actual public URLs, without a cache-busting query string.
            for obj in versioned + aliases:
                verify_fn(f'https://{bucket}/' + urllib.parse.quote(obj['key'], safe='/@+'), obj)
            print(f'Verified {bucket}: {manifest["version"]} ({tag})', flush=True)
        except (RuntimeError, OSError) as error:
            # A failed first pipeline must not prevent purging the other one.
            failures.append(f'{bucket}: {error}')
    if failures:
        raise RuntimeError('; '.join(failures))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('artifact')
    parser.add_argument('--tag', default='latest')
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    manifest = load_artifact(args.artifact)
    if not args.apply:
        print(f'Valid artifact {manifest["version"]}: {len(manifest["objects"])} objects. No writes.')
        return
    for name in ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'SCW_SECRET_KEY']:
        if not os.environ.get(name):
            raise ValueError(f'Set {name}')
    configure()
    deploy(args.artifact, manifest, args.tag, Storage())


if __name__ == '__main__':
    main()
