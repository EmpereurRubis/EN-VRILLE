import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

export async function generateIcon() {
  const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets');
  const svg = await readFile(path.join(assets, 'icon.svg'));
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 256 } }).render().asPng();
  const ico = Buffer.alloc(22 + png.length);
  ico.writeUInt16LE(0, 0); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
  ico.writeUInt8(0, 6); ico.writeUInt8(0, 7); ico.writeUInt8(0, 8); ico.writeUInt8(0, 9);
  ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12); ico.writeUInt32LE(png.length, 14); ico.writeUInt32LE(22, 18);
  png.copy(ico, 22);
  await Promise.all([writeFile(path.join(assets, 'icon.png'), png), writeFile(path.join(assets, 'icon.ico'), ico)]);
}
