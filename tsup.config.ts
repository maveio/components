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
  skipNodeModulesBundle: true,
  clean: true,
  dts: true,
  sourcemap: env !== 'production',
  target: 'es2020',
  noExternal: [
    'lit',
    'lit-element/lit-element.js',
    'lit-html',
    '@lit/reactive-element',
    '@lit-labs/react',
    '@lit-labs/observers',
    '@lit-labs/task',
    'js-base64',
    'url-parse',
    'requires-port',
    'querystringify',
    'media-chrome',
    'hls.js',
    'phoenix',
    'tus-js-client',
    '@lottiefiles/lottie-player',
    '@maveio/metrics',
  ],
  esbuildPlugins: [
    replace({
      __buildVersion: json.version,
      __MAVE_ENDPOINT__: process.env.MAVE_ENDPOINT || 'https://mave.io/api/v1',
      __MAVE_SOCKET_ENDPOINT__:
        process.env.MAVE_SOCKET_ENDPOINT || 'wss://mave.io/socket',
      __MAVE_UPLOAD_ENDPOINT__:
        process.env.MAVE_UPLOAD_ENDPOINT || 'https://upload.mave.io/files',
    }),
  ],
});
