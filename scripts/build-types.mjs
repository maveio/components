import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

execFileSync(
  process.execPath,
  ['node_modules/typescript-native/bin/tsc', '-p', 'tsconfig.build.json'],
  { stdio: 'inherit' },
);

// Native declaration emit preserves source imports. Add extensions so consumers
// can resolve the declarations with both Bundler and NodeNext module resolution.
async function finalizeDeclarations(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await finalizeDeclarations(filename);
    } else if (filename.endsWith('.d.ts')) {
      const source = await readFile(filename, 'utf8');
      const result = source.replace(
        /((?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"])(\.\.?\/[^'"]+)(['"])/g,
        (match, prefix, specifier, suffix) =>
          existsSync(path.resolve(directory, `${specifier}.d.ts`))
            ? `${prefix}${specifier}.js${suffix}`
            : match,
      );
      if (result !== source) await writeFile(filename, result);
    }
  }
}

await finalizeDeclarations('dist');
