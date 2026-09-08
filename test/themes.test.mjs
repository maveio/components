import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

import ts from 'typescript';

const transpile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
const loaderSource = transpile(
  await readFile(new URL('../src/themes/loader.ts', import.meta.url), 'utf8'),
);
const validTheme = `export function build(name, LitElement) {
  customElements.define('theme-' + name, class extends LitElement {});
}`;

// Run the actual loader and bundled themes with a small browser boundary. The
// controllable module transport lets us exercise network failures and overlap.
async function setup({ moduleSource = () => validTheme, distFolder = null } = {}) {
  const imports = [];
  const links = [];
  const elements = new Map();
  const context = createContext({
    URL,
    customElements: {
      get: (name) => elements.get(name),
      define(name, element) {
        assert.match(name, /^[a-z][a-z0-9-]*-[a-z0-9-]+$/);
        assert.equal(elements.has(name), false, `Duplicate registration: ${name}`);
        elements.set(name, element);
      },
    },
    document: {
      baseURI: 'https://website.example/articles/page.html',
      createElement: () => ({
        remove() {
          links.splice(links.indexOf(this), 1);
        },
      }),
      head: { appendChild: (link) => links.push(link) },
    },
  });
  const lit = new SyntheticModule(
    ['LitElement', 'html', 'css'],
    function () {
      this.setExport('LitElement', class {});
      this.setExport('html', () => {});
      this.setExport('css', () => {});
    },
    { context },
  );
  const origin = new SyntheticModule(
    ['potentialDistFolder'],
    function () {
      this.setExport('potentialDistFolder', () => distFolder);
    },
    { context },
  );
  const loader = new SourceTextModule(loaderSource, {
    context,
    initializeImportMeta(meta) {
      meta.url = 'https://cdn.example/components/index.js';
    },
    async importModuleDynamically(specifier) {
      imports.push(specifier);
      const source = /^\.\/(default|dolphin|synthwave)$/.test(specifier)
        ? transpile(
            await readFile(
              new URL(`../src/themes/${specifier.slice(2)}.ts`, import.meta.url),
              'utf8',
            ),
          )
        : await moduleSource(specifier);
      const module = new SourceTextModule(source, { context });
      await module.link(() => {
        throw new Error('Unexpected fixture import');
      });
      await module.evaluate();
      return module;
    },
  });
  await loader.link((specifier) => (specifier === 'lit' ? lit : origin));
  await loader.evaluate();
  return { ThemeLoader: loader.namespace.ThemeLoader, imports, links, elements, context };
}

test('built-in names take precedence and register the actual bundled themes once', async () => {
  const { ThemeLoader, imports, links, elements } = await setup();
  for (const name of ['default', 'dolphin', 'synthwave']) {
    const theme = await ThemeLoader.get(name, 'https://space.example/themes/player');
    assert.equal(theme.name, name);
    await ThemeLoader.get(name);
    assert.ok(elements.has(`theme-${name}`));
  }
  assert.equal((await ThemeLoader.get('  ')).name, 'default');
  assert.deepEqual(imports, ['./default', './dolphin', './synthwave']);
  assert.equal(links.length, 0);
});

test('CDN builds resolve built-in modules relative to the components distribution', async () => {
  const { ThemeLoader, imports } = await setup({ distFolder: 'dist/' });
  await ThemeLoader.get('dolphin');
  assert.deepEqual(imports, ['https://cdn.example/components/dist/themes/dolphin.js']);
});

test('paths resolve against the page, with query parameters preserved for JS and CSS', async () => {
  const { ThemeLoader, imports, links } = await setup();
  for (const value of [
    '/themes/brand.js?v=2#preview',
    './brand.js',
    '../brand.mjs',
    'https://assets.example/Brand.v2.js?v=3',
  ]) {
    await ThemeLoader.get(value, 'https://space.example/themes/player');
  }
  assert.deepEqual(imports, [
    'https://website.example/themes/brand.js?v=2',
    'https://website.example/articles/brand.js',
    'https://website.example/brand.mjs',
    'https://assets.example/Brand.v2.js?v=3',
  ]);
  assert.deepEqual(
    links.map((link) => link.href),
    [
      'https://website.example/themes/brand.css?v=2',
      'https://website.example/articles/brand.css',
      'https://website.example/brand.css',
      'https://assets.example/Brand.v2.css?v=3',
    ],
  );
});

test('explicit paths can use built-in filenames and respect the page base URL', async () => {
  const { ThemeLoader, imports, context } = await setup();
  context.document.baseURI = 'https://website.example/base/';
  assert.notEqual((await ThemeLoader.get('dolphin.js')).name, 'dolphin');
  assert.deepEqual(imports, ['https://website.example/base/dolphin.js']);
});

test('concurrent loads wait for the same registration and add only one stylesheet', async () => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const { ThemeLoader, imports, links } = await setup({
    moduleSource: async () => {
      await gate;
      return validTheme;
    },
  });
  let resolved = false;
  const first = ThemeLoader.get('/themes/brand.js');
  const second = ThemeLoader.get('/themes/brand.js#same').then((theme) => {
    resolved = true;
    return theme;
  });
  await new Promise(setImmediate);
  assert.equal(resolved, false);
  release();
  assert.equal((await first).name, (await second).name);
  assert.equal((await ThemeLoader.get('/themes/brand.js')).name, (await first).name);
  assert.equal(imports.length, 1);
  assert.equal(links.length, 1);
});

test('different origins, paths and versions with identical filenames stay independent', async () => {
  const { ThemeLoader } = await setup();
  const sources = [
    '/a/brand.js',
    '/b/brand.js',
    'https://other.example/a/brand.js',
    '/a/brand.js?v=2',
  ];
  const themes = await Promise.all(sources.map((source) => ThemeLoader.get(source)));
  assert.equal(new Set(themes.map((theme) => theme.name)).size, sources.length);
});

test('asynchronous build functions finish registering before any caller resolves', async () => {
  let release;
  const { ThemeLoader, context, elements } = await setup({
    moduleSource: () => `export async function build(name, LitElement) {
      await globalThis.registration;
      customElements.define('theme-' + name, class extends LitElement {});
    }`,
  });
  context.registration = new Promise((resolve) => {
    release = resolve;
  });
  let resolved = false;
  const pending = ThemeLoader.get('/async.js').then((theme) => {
    resolved = true;
    return theme;
  });
  await new Promise(setImmediate);
  assert.equal(resolved, false);
  release();
  const theme = await pending;
  assert.ok(elements.has(`theme-${theme.name}`));
});

test('existing named space themes still work and are isolated between spaces', async () => {
  const { ThemeLoader, imports } = await setup();
  const first = await ThemeLoader.get('brand', 'https://space-a.example/themes/player');
  const second = await ThemeLoader.get('brand', 'https://space-b.example/themes/player/');
  assert.notEqual(first.name, second.name);
  assert.deepEqual(imports, [
    'https://space-a.example/themes/player/brand.js',
    'https://space-b.example/themes/player/brand.js',
  ]);
});

test('failed imports are shared while pending, then evicted so a later load can retry', async () => {
  let unavailable = true;
  const { ThemeLoader, imports, links } = await setup({
    moduleSource: () => {
      if (unavailable) throw new Error('Network unavailable');
      return validTheme;
    },
  });
  const results = await Promise.allSettled([
    ThemeLoader.get('/brand.js'),
    ThemeLoader.get('/brand.js'),
  ]);
  assert.ok(results.every((result) => result.status === 'rejected'));
  assert.equal(imports.length, 1);
  assert.equal(links.length, 0);
  unavailable = false;
  assert.ok((await ThemeLoader.get('/brand.js')).name);
  assert.equal(imports.length, 2);
});

test('invalid module contracts reject without permanently caching failure', async () => {
  for (const source of [
    'export const unrelated = true;',
    'export function build() {}',
    'export function build() { throw new Error("broken"); }',
  ]) {
    let current = source;
    const { ThemeLoader } = await setup({ moduleSource: () => current });
    await assert.rejects(ThemeLoader.get('/brand.js'));
    current = validTheme;
    assert.ok((await ThemeLoader.get('/brand.js')).name);
  }
});

test('optional stylesheet failures do not reject the theme or accumulate dead links', async () => {
  const { ThemeLoader, imports, links } = await setup();
  const first = await ThemeLoader.get('/brand.js');
  links[0].onerror();
  assert.equal(links.length, 0);
  assert.equal((await ThemeLoader.get('/brand.js')).name, first.name);
  assert.equal(imports.length, 1);
  assert.equal(links.length, 1);
});
