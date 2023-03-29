import * as dotenv from 'dotenv';
import { replace } from 'esbuild-plugin-replace';
import { defineConfig } from 'tsup';

import json from './package.json';
dotenv.config();

const env = process.env.NODE_ENV;

export default defineConfig({
  platform: 'browser',
  entry: ['src/**/*.ts'],
  entryPoints: ['src/index.ts', 'src/react.ts'],
  format: ['cjs', 'esm'],
  splitting: true,
  minify: env === 'production',
  bundle: env === 'production',
  outDir: env === 'production' ? 'dist' : 'lib',
  skipNodeModulesBundle: true,
  clean: true,
  dts: true,
  sourcemap: env !== 'production',
  target: 'es2020',
  noExternal: [
    'lit',
    'media-chrome',
    '@lit/reactive-element',
    'lit-html',
    'lit-element/lit-element.js',
    '@lit-labs/task',
    'hls.js',
    'phoenix',
    'tus-js-client',
    'js-base64',
    'url-parse',
    'requires-port',
    'querystringify',
    '@lit-labs/observers',
    '@maveio/metrics',
    '@lit-labs/react',
  ],
  esbuildPlugins: [
    replace({
      __buildVersion: json.version,
      __MAVE_ENDPOINT__: process.env.MAVE_ENDPOINT || 'https://mave.io/api/v1',
      __MAVE_UPLOAD_ENDPOINT__:
        process.env.MAVE_UPLOAD_ENDPOINT || 'https://upload.mave.io/files',
    }),
  ],
});
