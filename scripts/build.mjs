import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
for (const args of [
  ['scripts/create-component-svgs.mjs'],
  ['scripts/generate-docs.mjs'],
  ['scripts/check.mjs'],
  ['--test', 'tests/spring.test.mjs'],
]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status) process.exit(result.status ?? 1);
}
fs.rmSync('dist', { recursive: true, force: true });
fs.cpSync('docs', 'dist', { recursive: true });
console.log('Static site ready in dist/. All browser assets are local.');
