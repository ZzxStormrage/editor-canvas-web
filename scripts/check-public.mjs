import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listPublicFiles } from './public-files.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const allowedHosts = new Set([
  'github.com', 'www.leaferjs.com', 'registry.npmjs.org',
  'example.com', 'cdn.example.com', 'localhost', 'www.w3.org',
  'paulmillr.com', 'eslint.org', 'feross.org', 'opencollective.com', 'tidelift.com', 'www.patreon.com'
]);
const credentials = [
  /eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:ghp_|github_pat_|sk-live-)[A-Za-z0-9_]{20,}/,
  /\bAKIA[A-Z0-9]{16}\b/
];

/** @param {string} projectRoot 检查目录。 @returns {Promise<string[]>} 已检查文件。 */
export async function checkPublicFiles(projectRoot = root) {
  const files = await listPublicFiles(projectRoot);
  const failures = [];
  for (const relative of files) {
    const content = await readFile(join(projectRoot, relative), 'utf8');
    // Only report locations; never print credentials or user data.
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (credentials.some((pattern) => pattern.test(line))) {
        failures.push(`${relative}:${index + 1}: possible credential`);
      }
      for (const match of line.matchAll(/https?:\/\/[^\s<>"'`)]+/g)) {
        try {
          const url = new URL(match[0]);
          if (!allowedHosts.has(url.hostname) || url.username || url.password) {
            failures.push(`${relative}:${index + 1}: unapproved URL`);
          }
        } catch {
          failures.push(`${relative}:${index + 1}: malformed URL`);
        }
      }
    });
  }
  if (failures.length) throw new Error(failures.join('\n'));
  return files;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const files = await checkPublicFiles();
  console.log(`Public-file check passed: ${files.length} files (allowlist, URL and credential checks).`);
}
