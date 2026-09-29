import { build } from 'esbuild';
import { parse } from 'acorn';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

// Input is the extracted npm tarball, not a second compilation of the sources.
const source = path.resolve(process.argv[2] ?? '.');
const output = path.resolve(process.argv[3] ?? 'cdn-artifact');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await readFile(path.join(source, 'package.json')));
if (pkg.name !== '@maveio/components' || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(pkg.version)) {
  throw new Error('Expected a versioned @maveio/components package');
}
// Refuse stale output: a release artifact must have a single, complete manifest.
await mkdir(output);
const prefix = `npm/@maveio/components@${pkg.version}`;
const versionDir = path.join(output, 'build');
await mkdir(versionDir, { recursive: true });
await cp(path.join(source, 'dist'), path.join(versionDir, 'dist'), { recursive: true });
for (const name of ['package.json', 'LICENCE', 'LICENSE', 'README.md']) {
  try { await cp(path.join(source, name), path.join(versionDir, name)); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}

async function files(dir) {
  const found = [];
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const name = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink in package: ${name}`);
    if (entry.isDirectory()) found.push(...await files(name));
    else found.push(name);
  }
  return found;
}

const entries = ['index', 'config', 'themes/default', 'themes/dolphin', 'themes/synthwave',
  'generated/locales/en', 'generated/locales/nl', 'generated/locales/de', 'generated/locales/fr'];
const result = await build({
  absWorkingDir: source,
  entryPoints: Object.fromEntries(entries.map(name => [name, `dist/${name}.js`])),
  outdir: path.join(versionDir, 'esm'),
  nodePaths: [path.join(root, 'node_modules')],
  bundle: true, splitting: true, format: 'esm', platform: 'browser', target: 'es2020',
  minify: true, metafile: true, legalComments: 'eof', charset: 'utf8',
  define: { 'process.env.NODE_ENV': '"production"' },
  chunkNames: 'chunks/[name]-[hash]',
});
for (const info of Object.values(result.metafile.outputs)) {
  for (const imported of info.imports) {
    if (imported.external) throw new Error(`External browser dependency: ${imported.path}`);
  }
}
await writeFile(path.join(output, 'build-meta.json'), JSON.stringify(result.metafile, null, 2));

const forward = (url, hasDefault = false) => `export * from ${JSON.stringify(url)};\n` +
  (hasDefault ? `export {default} from ${JSON.stringify(url)};\n` : '');
const objects = new Map();
function put(key, body) { objects.set(key, Buffer.from(body)); }
for (const filename of await files(versionDir)) {
  if (filename.includes(`${path.sep}esm${path.sep}`) && filename.endsWith('.js') &&
      /\/\/[#@]\s*sourceMappingURL=/.test(await readFile(filename, 'utf8'))) {
    throw new Error(`Unexpected sourcemap reference in CDN bundle: ${filename}`);
  }
  put(`${prefix}/${path.relative(versionDir, filename)}`, await readFile(filename));
}
// Keep historical +esm URLs, including the theme/locale submodule endpoints.
await put(`${prefix}/+esm`, forward(`/${prefix}/esm/index.js`));
for (const name of entries) {
  await put(`${prefix}/dist/${name}.js/+esm`, forward(`/${prefix}/esm/${name}.js`));
}

// JS aliases forward to immutable releases. This also preserves old chunk URLs
// for cached callers; deploy never deletes any prior objects.
const aliasPrefix = 'npm/@maveio/components';
for (const [key, body] of [...objects]) {
  const relative = key.slice(prefix.length + 1);
  if (relative.startsWith('esm/')) continue;
  let aliasBody = body;
  if (relative.endsWith('.js')) {
    const ast = parse(body.toString(), { ecmaVersion: 'latest', sourceType: 'module' });
    const hasDefault = ast.body.some(node => node.type === 'ExportDefaultDeclaration' ||
      (node.type === 'ExportNamedDeclaration' && node.specifiers.some(s =>
        (s.exported.name ?? s.exported.value) === 'default')));
    aliasBody = forward(`/${key}`, hasDefault);
  }
  put(`${aliasPrefix}/${relative}`, aliasBody);
}

const digest = body => createHash('sha256').update(body).digest('hex');
const manifest = { schema: 1, package: pkg.name, version: pkg.version, objects: [] };
await mkdir(path.join(output, 'payloads'));
for (const [key, body] of [...objects].sort(([a], [b]) => a.localeCompare(b))) {
  const compressed = gzipSync(body, { level: 9 });
  const sha256 = digest(body);
  const compressedSha256 = digest(compressed);
  const file = `payloads/${compressedSha256}.gz`;
  await writeFile(path.join(output, file), compressed);
  const javascript = key.endsWith('.js') || key.endsWith('.cjs') || key.endsWith('+esm');
  const types = { '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.wasm': 'application/wasm',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg' };
  manifest.objects.push({
    key, file, sha256, compressedSha256, bytes: body.length, compressedBytes: compressed.length,
    contentType: javascript ? 'text/javascript; charset=utf-8' :
      types[path.extname(key)] ?? 'text/plain; charset=utf-8',
    contentEncoding: 'gzip',
    cacheControl: key.startsWith(`${prefix}/`) ? 'public,max-age=31536000,immutable' :
      'public,max-age=60,must-revalidate',
    immutable: key.startsWith(`${prefix}/`),
  });
}
await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`CDN ${pkg.version}: ${manifest.objects.length} objects; no jsDelivr or Fly dependency`);
