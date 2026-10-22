import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { checkPublicFiles } from './check-public.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const destination = resolve(process.argv[2] ?? join(root, '.public-export/canvas-editor'));
const files = await checkPublicFiles(root);

// An existing destination is always rejected; no files or repositories are overwritten.
await mkdir(dirname(destination), { recursive: true });
await mkdir(destination);
for (const relative of files) {
  await mkdir(dirname(join(destination, relative)), { recursive: true });
  await copyFile(join(root, relative), join(destination, relative));
}
await checkPublicFiles(destination);
execFileSync('git', ['init', '--initial-branch=main', destination], { stdio: 'pipe' });
console.log(`Exported ${files.length} files into ${destination}`);
console.log('Initialized a fresh Git repository with no commits and no remote.');
