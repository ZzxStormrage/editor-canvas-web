import { lstat, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export const PUBLIC_ENTRIES = [
  'src', 'tests', 'examples', 'scripts', '.github',
  '.agents/skills/canvas-editor-frontend/SKILL.md',
  'index.html', 'package.json', 'package-lock.json', 'README.md', 'LICENSE',
  'CONTRIBUTING.md', 'THIRD_PARTY_NOTICES.md',
  '.gitignore', '.editorconfig', '.eslintrc.cjs', '.prettierrc.cjs', 'vite.config.js'
];

/** @param {string} root 项目根目录。 @returns {Promise<string[]>} 允许公开的相对路径。 */
export async function listPublicFiles(root) {
  const files = [];
  /** @param {string} relative 相对路径。 @returns {Promise<void>} 遍历完成。 */
  async function visit(relative) {
    const stat = await lstat(join(root, relative));
    if (stat.isSymbolicLink()) throw new Error(`Symbolic link is not allowed: ${relative}`);
    if (stat.isDirectory()) {
      for (const name of (await readdir(join(root, relative))).sort()) {
        if (name === '.DS_Store') continue;
        if (name.startsWith('.')) throw new Error(`Unexpected hidden entry: ${relative}/${name}`);
        await visit(join(relative, name));
      }
    } else if (stat.isFile()) {
      files.push(relative);
    } else {
      throw new Error(`Unsupported public entry: ${relative}`);
    }
  }
  for (const entry of PUBLIC_ENTRIES) await visit(entry);
  return files;
}
