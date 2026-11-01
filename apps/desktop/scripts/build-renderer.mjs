import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { cp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { generateIcon } from './generate-icon.mjs';

const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRequire = createRequire(path.resolve(desktop, '../web/package.json'));
const { build } = await import(pathToFileURL(webRequire.resolve('vite')).href);
const { default: react } = await import(pathToFileURL(webRequire.resolve('@vitejs/plugin-react')).href);
const { default: tailwindcss } = await import(pathToFileURL(webRequire.resolve('@tailwindcss/vite')).href);
await generateIcon();
await build({
  configFile: false,
  root: path.resolve(desktop, '../web'),
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: path.join(desktop, 'renderer'), emptyOutDir: true, sourcemap: false },
});
await mkdir(path.join(desktop, 'renderer', 'media'), { recursive: true });
const media = path.resolve(desktop, '../../packages/content/media');
for (const entry of await readdir(media, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.svg')) await cp(path.join(media, entry.name), path.join(desktop, 'renderer/media', entry.name));
}
// Keep the pre-React theme initialization, while retaining a strict script CSP.
const indexPath = path.join(desktop, 'renderer/index.html');
let html = await readFile(indexPath, 'utf8');
const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)];
for (const [tag, attributes, script] of inlineScripts) {
  const name = `boot-${createHash('sha256').update(script).digest('hex').slice(0, 12)}.js`;
  await writeFile(path.join(desktop, 'renderer/assets', name), script);
  html = html.replace(tag, `<script${attributes} src="./assets/${name}"></script>`);
}
await writeFile(indexPath, html);
