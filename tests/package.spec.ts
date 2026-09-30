import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { createApp, h, nextTick } from 'vue';

let directory: string;
let packageRoot: string;
let pkg: { exports: Record<string, { import: string; types: string }> };

async function entry(name: string) {
  return import(
    /* @vite-ignore */ `/@fs/${path.join(packageRoot, pkg.exports[name].import)}`
  );
}

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'mave-package-test-'));
  const packed = JSON.parse(
    execFileSync(
      'npm',
      [
        'pack',
        '--ignore-scripts',
        '--json',
        '--pack-destination',
        directory,
        '--cache',
        path.join(directory, 'npm-cache'),
      ],
      { encoding: 'utf8' },
    ),
  );
  execFileSync('tar', [
    '-xzf',
    path.join(directory, packed[0].filename),
    '-C',
    directory,
  ]);
  packageRoot = path.join(directory, 'package');
  // Only external runtime dependencies come from the workspace. All component
  // JavaScript and declarations must be present in the actual npm tarball.
  await symlink(
    path.resolve('node_modules'),
    path.join(packageRoot, 'node_modules'),
    'dir',
  );
  pkg = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
});

afterAll(async () => {
  document.body.replaceChildren();
  if (directory) await rm(directory, { recursive: true, force: true });
});

it('ships working native exports and configuration in the npm tarball', async () => {
  const components = await entry('.');
  for (const [name, tag] of Object.entries({
    Player: 'player',
    Audio: 'audio',
    Clip: 'clip',
    Upload: 'upload',
    List: 'list',
    Image: 'img',
    Text: 'text',
    Pop: 'pop',
    Files: 'files',
  })) {
    expect(document.createElement(`mave-${tag}`)).toBeInstanceOf(components[name]);
  }
  const config = await entry('./config');
  expect(typeof config.configureMave).toBe('function');
  for (const value of Object.values(pkg.exports)) {
    if (typeof value === 'object')
      expect(await readFile(path.join(packageRoot, value.types), 'utf8')).not.toBe('');
  }
});

it('renders React and Vue wrappers from the packed entrypoints', async () => {
  const react = await entry('./react');
  const vue = await entry('./vue');
  const reactHost = document.createElement('div');
  const vueHost = document.createElement('div');
  document.body.append(reactHost, vueHost);
  const root = createRoot(reactHost);
  const app = createApp({ render: () => h(vue.Player, { controls: 'none' }) });
  try {
    flushSync(() => root.render(createElement(react.Audio, { controls: 'none' })));
    app.mount(vueHost);
    await nextTick();
    expect(reactHost.querySelector('mave-audio')?.controls).toEqual(['none']);
    expect(vueHost.querySelector('mave-player')?.controls).toEqual(['none']);
  } finally {
    flushSync(() => root.unmount());
    app.unmount();
  }
});

it('ships declarations that typecheck for consumers using NodeNext resolution', async () => {
  await writeFile(path.join(directory, 'package.json'), '{"type":"module"}');
  await writeFile(
    path.join(directory, 'consumer.ts'),
    `
    import { Player, Audio, Upload } from './package/dist/index.js';
    import { Player as ReactPlayer } from './package/dist/react.js';
    import { Player as VuePlayer } from './package/dist/vue.js';
    export { Player, Audio, Upload, ReactPlayer, VuePlayer };
  `,
  );
  await writeFile(
    path.join(directory, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        noEmit: true,
        strict: true,
        skipLibCheck: false,
        module: 'NodeNext',
        target: 'ES2020',
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      },
      files: ['consumer.ts'],
    }),
  );
  execFileSync(
    process.execPath,
    [
      'node_modules/typescript-native/bin/tsc',
      '-p',
      path.join(directory, 'tsconfig.json'),
    ],
    { stdio: 'pipe' },
  );
});

it('builds the CDN from the npm tarball without unresolved browser dependencies', async () => {
  const output = path.join(directory, 'cdn');
  execFileSync(process.execPath, ['scripts/build-cdn.mjs', packageRoot, output], {
    stdio: 'pipe',
  });
  const manifest = JSON.parse(await readFile(path.join(output, 'manifest.json'), 'utf8'));
  expect(
    manifest.objects.some(
      (object: { key: string }) => object.key === 'npm/@maveio/components/+esm',
    ),
  ).toBe(true);
  const meta = JSON.parse(await readFile(path.join(output, 'build-meta.json'), 'utf8'));
  for (const entry of Object.values(meta.outputs) as {
    imports: { external?: boolean }[];
  }[]) {
    expect(entry.imports.some((dependency) => dependency.external)).toBe(false);
  }
});
