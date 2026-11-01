import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const source = path.resolve(process.argv[2] || path.join(root, '.local/cinema-source/tears_of_steel_720p.mov'));
const catalogue = path.join(root, 'packages/content/cinema/catalogue.json');
const scenes = [
  ['alerte-au-labo', 'Une urgence au laboratoire', 122, 'science-fiction'],
  ['le-grand-conseil', 'Le conseil des experts', 150, 'confrontation'],
  ['reunion-au-sommet', 'Une réunion très importante', 180, 'confrontation'],
  ['rendez-vous-sur-le-pont', 'Un rendez-vous sur le pont', 210, 'romance'],
  ['la-mauvaise-nouvelle', 'La mauvaise nouvelle', 240, 'drame'],
  ['reunion-de-crise', 'La réunion de crise', 272, 'science-fiction'],
  ['un-silence-genant', 'Un silence particulièrement gênant', 305, 'romance'],
  ['une-explication-delicate', 'Une explication délicate', 338, 'drame'],
  ['le-grand-malentendu', 'Le grand malentendu', 368, 'romance'],
  ['le-regard-qui-tue', 'Un regard qui en dit long', 398, 'confrontation'],
  ['le-plan-impossible', 'Le plan impossible', 490, 'science-fiction'],
  ['le-dernier-espoir', 'Le dernier espoir du laboratoire', 524, 'science-fiction'],
];
function command(args) { return new Promise((done, reject) => {
  const task = spawn(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { windowsHide: true });
  let error = ''; task.stderr.on('data', data => { error = (error + data).slice(-4000); });
  task.on('error', reject); task.on('close', code => code === 0 ? done() : reject(new Error(error || `FFmpeg ${code}`)));
}); }
const rights = {
  title: 'Tears of Steel (2012)', sourceUrl: 'https://mango.blender.org/sharing/',
  license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/', territories: ['worldwide'],
  credits: '(CC) Blender Foundation | mango.blender.org. Tears of Steel, directed by Ian Hubert (2012). Silent excerpts and extracted frames adapted for EN VRILLE; original audio removed.',
  verifiedAt: '2026-11-01', commercialUse: true,
};
const entries = [];
for (const [slug, title, start, category] of scenes) {
  const id = `tos-${slug}`, directory = path.join(root, 'packages/content/media/cinema', id);
  await mkdir(directory, { recursive: true });
  await command(['-ss', String(start), '-i', source, '-t', '24', '-an', '-vf', 'scale=960:-2', '-r', '24', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-threads', '2', '-movflags', '+faststart', path.join(directory, 'clip.mp4')]);
  await command(['-i', path.join(directory, 'clip.mp4'), '-vf', 'fps=1/2', '-frames:v', '12', '-q:v', '3', path.join(directory, 'frame-%02d.jpg')]);
  const frames = [];
  for (let index = 1; index <= 12; index++) {
    const temporary = path.join(directory, `frame-${String(index).padStart(2, '0')}.jpg`);
    const digest = createHash('sha256').update(await readFile(temporary)).digest('hex').slice(0, 20);
    const name = `${digest}.jpg`; await rename(temporary, path.join(directory, name));
    frames.push({ url: `/media/cinema/${id}/${name}`, timecodeMs: (index - 1) * 2000, subtitlePosition: 'bottom' });
  }
  entries.push({ id, title, category, sourceVideoUrl: 'https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov', clipUrl: `/media/cinema/${id}/clip.mp4`, frames, width: 960, height: 400, rights });
  console.log(`${id}: 12 chronological frames, 24 seconds, no audio`);
}
await writeFile(catalogue, JSON.stringify(entries, null, 2) + '\n');
await writeFile(path.join(root, 'packages/content/cinema/credits.json'), JSON.stringify([rights], null, 2) + '\n');
console.log(`Prepared ${entries.length} licensed cinema sequences.`);
