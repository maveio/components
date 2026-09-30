import { defineConfig } from 'vitest/config';
import { tmpdir } from 'node:os';
import { realpathSync } from 'node:fs';
import path from 'node:path';

export default defineConfig({
  // Exercise the browser wrapper, rather than @lit/react's server-rendering stub.
  resolve: { alias: { '@lit/react': path.resolve('node_modules/@lit/react/index.js') } },
  server: { fs: { allow: [process.cwd(), tmpdir(), realpathSync(tmpdir())] } },
  test: {
    environment: 'happy-dom',
    include: ['tests/package.spec.ts'],
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
