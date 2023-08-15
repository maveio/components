import * as dotenv from 'dotenv';
import { replace } from 'esbuild-plugin-replace';
import { defineConfig } from 'tsup';

import json from './package.json';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  platform: 'browser',
  entry: ['src/**/*.ts'],
  entryPoints: ['src/index.ts', 'src/react.ts'],
  format: ['cjs', 'esm', 'iife'],
  splitting: true,
  treeshake: isProduction,
  minify: isProduction,
  skipNodeModulesBundle: true,
  clean: true,
  dts: true,
  sourcemap: !isProduction,
  target: 'es2020',
  noExternal: [
    'lit',
    'lit-element/lit-element.js',
    'lit-html',
    '@lit/reactive-element',
    '@lit-labs/react',
    '@lit-labs/observers',
    '@lit-labs/task',
    '@lit/localize',
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
      __MAVE_ENDPOINT__: isProduction
        ? 'https://mave.io/api/v1'
        : process.env.MAVE_ENDPOINT,
      __ROOT_DIR__: isProduction ? './dist' : './',
      __MAVE_SOCKET_ENDPOINT__: isProduction
        ? 'wss://app.mave.io/api/v1/socket'
        : process.env.MAVE_SOCKET_ENDPOINT,
      __MAVE_UPLOAD_ENDPOINT__: isProduction
        ? 'https://upload.mave.io/files'
        : process.env.MAVE_UPLOAD_ENDPOINT,
      __MAVE_METRICS_SOCKET_ENDPOINT__: isProduction
        ? 'wss://metrics.video-dns.com/socket'
        : process.env.MAVE_METRICS_SOCKET_ENDPOINT,
    }),
  ],
});
