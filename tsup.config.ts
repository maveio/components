import { execFileSync } from 'node:child_process';
import * as dotenv from 'dotenv';
import { replace } from 'esbuild-plugin-replace';
import { defineConfig } from 'tsup';

import json from './package.json';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
  platform: 'browser',
  entry: {
    index: 'src/index.ts',
    config: 'src/config.ts',
    react: 'src/react.ts',
    vue: 'src/vue.ts',
    'generated/locales/de': 'src/generated/locales/de.ts',
    'generated/locales/en': 'src/generated/locales/en.ts',
    'generated/locales/fr': 'src/generated/locales/fr.ts',
    'generated/locales/nl': 'src/generated/locales/nl.ts',
    'themes/default': 'src/themes/default.ts',
    'themes/dolphin': 'src/themes/dolphin.ts',
    'themes/synthwave': 'src/themes/synthwave.ts',
  },
  format: ['esm', 'cjs'],
  splitting: true,
  treeshake: isProduction,
  minify: isProduction,
  skipNodeModulesBundle: true,
  clean: true,
  sourcemap: !isProduction,
  target: 'es2020',
  watch: isDev,
  // TypeScript 7 emits declarations directly; tsup's DTS bundler uses the old API.
  onSuccess: async () => {
    execFileSync(process.execPath, ['scripts/build-types.mjs'], {
      stdio: 'inherit',
    });
  },
  noExternal: [
    'lit',
    'lit-element/lit-element.js',
    'lit-html',
    '@lit/reactive-element',
    '@lit-labs/react',
    '@lit-labs/observers',
    '@lit/task',
    '@lit/localize',
    'js-base64',
    'url-parse',
    'requires-port',
    'querystringify',
    'media-chrome',
    'hls.js',
    'phoenix',
    'tus-js-client',
    '@maveio/data',
  ],
  esbuildPlugins: [
    replace({
      __buildVersion: json.version,
      __MAVE_ENDPOINT__: isProduction
        ? 'https://api.mave.io/api/v1'
        : process.env.MAVE_ENDPOINT,
      __MAVE_PLAYBACK_ENDPOINT__: isProduction
        ? 'https://space-${this.spaceId}.signed.video-dns.com/${this.embedId}'
        : process.env.MAVE_PLAYBACK_ENDPOINT || '',
      __MAVE_SOCKET_ENDPOINT__: isProduction
        ? 'wss://dash.mave.io/api/v1/socket'
        : process.env.MAVE_SOCKET_ENDPOINT,
      __MAVE_UPLOAD_ENDPOINT__: isProduction
        ? 'https://upload.mave.io/files'
        : process.env.MAVE_UPLOAD_ENDPOINT,
      __MAVE_METRICS_ENDPOINT__: isProduction
        ? 'https://metrics.video-dns.com/v1/events'
        : process.env.MAVE_METRICS_ENDPOINT,
      __MAVE_CDN_ENDPOINT__: isProduction
        ? 'https://space-${this.spaceId}.video-dns.com'
        : process.env.MAVE_CDN_ENDPOINT,
    }),
  ],
});
