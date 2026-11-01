import { createReadStream } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const release = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../release');
const files = (await readdir(release)).filter(name => name.endsWith('.exe')).sort();
if (files.length < 2) throw new Error('Build both Windows distributions before generating checksums.');
const lines = [];
for (const file of files) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path.join(release, file))) hash.update(chunk);
  lines.push(`${hash.digest('hex')}  ${file}`);
}
await writeFile(path.join(release, 'SHA256SUMS.txt'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
