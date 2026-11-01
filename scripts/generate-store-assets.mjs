/** Original Steam artwork. No external fonts, images, APIs or network requests. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Resvg } from '@resvg/resvg-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = resolve(root, 'marketing/source');
const outputDir = resolve(root, 'marketing/assets');
await Promise.all([mkdir(sourceDir, { recursive: true }), mkdir(outputDir, { recursive: true })]);
const source = await readFile(resolve(sourceDir, 'vrill.svg'), 'utf8');
const vrillBody = source.replace(/^.*?<svg[^>]*>/s, '').replace(/<\/svg>\s*$/, '');
const C = { red: '#ef344a', bright: '#ff6477', cream: '#fff1db', ink: '#151316', rose: '#753041' };

// A small, purpose-built alphabet drawn as outlines; no font files are embedded.
const letters = {
  E: { width: 53, path: 'M0 0h53v15H18v13h30v15H18v14h35v15H0Z' },
  N: { width: 58, path: 'M0 72V0h18l22 40V0h18v72H40L18 32v40Z' },
  V: { width: 61, path: 'M0 0h19l12 49L43 0h18L40 72H21Z' },
  R: { width: 59, path: 'M0 72V0h31q26 0 26 23 0 16-13 22l15 27H38L25 48h-7v24Zm18-39h12q9 0 9-10 0-8-9-8H18Z' },
  I: { width: 19, path: 'M0 0h19v72H0Z' },
  L: { width: 51, path: 'M0 0h19v56h32v16H0Z' },
  '!': { width: 22, path: 'M1 0h20l-3 49H4ZM2 56h18v16H2Z' },
};
function word(text, { color = C.cream, gap = 8 } = {}) {
  let x = 0;
  return [...text].map(letter => {
    const glyph = letters[letter];
    if (!glyph) throw new Error(`Unsupported logo glyph: ${letter}`);
    const result = `<path transform="translate(${x} 0)" d="${glyph.path}" fill="${color}" fill-rule="evenodd"/>`;
    x += glyph.width + gap;
    return result;
  }).join('');
}
function logo({ x = 0, y = 0, scale = 1, rotate = -4, shadow = true } = {}) {
  return `<g transform="translate(${x} ${y}) scale(${scale}) rotate(${rotate} 200 88)">
    ${shadow ? '<path d="m-13-12 151-1 18 82 252-4 7 119-416 9Z" fill="#100d12" stroke="#100d12" stroke-width="18" stroke-linejoin="round"/>' : ''}
    <g transform="translate(5 0)">${word('EN', { color: C.cream })}</g>
    <path d="m143 8 47 12-20 28-5 27-28-12 16-25Z" fill="${C.red}"/>
    <g transform="translate(0 92)">${word('VRILLE!', { color: C.red, gap: 7 })}</g>
  </g>`;
}
function character(x, y, scale, rotate = 0) {
  return `<g transform="translate(${x} ${y}) scale(${scale}) rotate(${rotate} 170 185)">${vrillBody}</g>`;
}
function burst(x, y, scale, color = C.red, rotate = 0) {
  return `<path transform="translate(${x} ${y}) scale(${scale}) rotate(${rotate})" d="m0-39 12 24 26-11-10 27 28 10-28 10 10 27-26-11-12 24-10-24-28 11 12-27-28-10 28-10-12-27 28 11Z" fill="${color}"/>`;
}
function question(x, y, scale, angle = 0) {
  return `<g transform="translate(${x} ${y}) scale(${scale}) rotate(${angle} 50 50)"><path d="M9 4h92q14 0 14 14v61q0 14-14 14H38L13 112l5-19H9Q-5 93-5 79V18Q-5 4 9 4" fill="#3c2533" stroke="#a44b63" stroke-width="3"/><path d="M36 33q1-14 20-14 19 0 19 14 0 9-14 14-7 3-7 12" stroke="#f698a8" stroke-width="10" stroke-linecap="round" fill="none"/><circle cx="54" cy="76" r="5" fill="#f698a8"/></g>`;
}
function microphone(x, y, scale, angle = 0) {
  return `<g transform="translate(${x} ${y}) scale(${scale}) rotate(${angle} 50 50)"><rect x="33" y="3" width="34" height="61" rx="17" fill="#f4b2be"/><path d="M22 42v10q0 28 28 28t28-28V42M50 81v22M31 106h38" stroke="#f4b2be" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M42 16h17m-17 11h17m-17 11h17" stroke="#5d2f40" stroke-width="4" stroke-linecap="round"/></g>`;
}
function gavel(x, y, scale, angle = 0) {
  return `<g transform="translate(${x} ${y}) scale(${scale}) rotate(${angle} 50 50)"><path d="m48 49 37 43" stroke="#b65d72" stroke-width="13" stroke-linecap="round"/><rect x="12" y="12" width="66" height="30" rx="7" transform="rotate(-38 45 27)" fill="#cf8a99" stroke="#512333" stroke-width="3"/><path d="M9 101h75l8 10H1Z" fill="#7a3b51"/></g>`;
}
function phone(x, y, scale, angle = 0) {
  return `<g transform="translate(${x} ${y}) scale(${scale}) rotate(${angle} 55 90)"><rect x="0" y="0" width="110" height="180" rx="19" fill="#221b25" stroke="#ac5c73" stroke-width="5"/><rect x="9" y="15" width="92" height="140" rx="10" fill="#452535"/><rect x="37" y="6" width="36" height="5" rx="3" fill="#996074"/><circle cx="55" cy="168" r="4" fill="#b86c83"/>${burst(55, 78, .68, C.red, -10)}<path d="m23 135 20-13 17 7 24-19" stroke="#e8b5c4" stroke-width="4" stroke-linecap="round" fill="none"/></g>`;
}
function backdrop(w, h, { hero = false } = {}) {
  const cx = w * (hero ? .74 : .72), cy = h * .53;
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 31 - 160) * Math.PI / 180;
    const b = a + .13;
    const r = Math.max(w, h) * 2;
    return `<path d="M${cx} ${cy} ${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r} ${cx + Math.cos(b) * r} ${cy + Math.sin(b) * r}Z" fill="${i % 2 ? '#ff7b8f' : '#b23a58'}" opacity=".045"/>`;
  }).join('');
  const confetti = [ [.03,.17,17], [.11,.74,-23], [.25,.93,38], [.42,.12,-31], [.55,.86,27], [.69,.14,-20], [.94,.33,44], [.9,.9,-22], [.48,.66,-12], [.17,.42,40] ];
  return `<defs>
    <radialGradient id="glow" cx="76%" cy="44%" r="73%"><stop stop-color="#8a2b42"/><stop offset=".55" stop-color="#321b29"/><stop offset="1" stop-color="#151316"/></radialGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#9e3c56" stop-opacity=".28"/><stop offset="1" stop-color="#1a151e" stop-opacity="0"/></linearGradient>
    <pattern id="halftone" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#e6b2c4" opacity=".065"/></pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  ${rays}<rect width="${w}" height="${h}" fill="url(#halftone)"/>
  <path d="M${w * .64} ${-h * .1} ${w * .93} ${-h * .1} ${w * .75} ${h * .83} ${w * .51} ${h * .83}Z" fill="#fcaabb" opacity=".035"/>
  <ellipse cx="${cx}" cy="${h * .9}" rx="${w * .47}" ry="${h * .19}" fill="url(#floor)"/>
  <path d="M${-w * .07} ${h * .97}Q${w * .5} ${h * .78} ${w * 1.1} ${h * .99}" stroke="#a34c64" stroke-width="${Math.max(1, h / 480)}" fill="none" opacity=".24"/>
  ${confetti.map(([x,y,angle], i) => `<rect x="${w * x}" y="${h * y}" width="${Math.max(4, w / 125)}" height="${Math.max(10, h / 40)}" rx="1" transform="rotate(${angle} ${w * x} ${h * y})" fill="${i % 3 ? '#f26d88' : '#e8b2be'}" opacity="${i % 2 ? '.2' : '.35'}"/>`).join('')}`;
}
function svg(w, h, body) { return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>\n`; }
const assets = [
  { id: 'header-capsule', width: 920, height: 430, usage: 'Steam store header capsule', body: () => `${backdrop(920,430)}${question(478,58,.66,-12)}${microphone(829,270,.7,20)}${gavel(320,335,.64,-15)}${character(545,23,1.03,6)}${logo({x:47,y:116,scale:1.12})}${burst(503,326,.28,C.bright,8)}` },
  { id: 'small-capsule', width: 462, height: 174, usage: 'Steam store small capsule', body: () => `${backdrop(462,174)}${character(305,-2,.49,6)}${logo({x:19,y:23,scale:.71,shadow:true})}` },
  { id: 'main-capsule', width: 1232, height: 706, usage: 'Steam store main capsule', body: () => `${backdrop(1232,706)}${question(711,75,.89,-17)}${microphone(1107,442,1.03,18)}${gavel(460,530,.92,-25)}${phone(63,493,.76,-13)}${character(690,67,1.56,5)}${logo({x:66,y:183,scale:1.72})}${burst(632,530,.46,C.bright,8)}` },
  { id: 'vertical-capsule', width: 748, height: 896, usage: 'Steam store vertical capsule', body: () => `${backdrop(748,896)}${question(65,383,1.15,-14)}${microphone(602,464,.91,14)}${gavel(538,747,.86,-16)}${phone(45,678,.8,-16)}${character(117,337,1.43,3)}${logo({x:79,y:76,scale:1.5})}${burst(639,367,.48,C.bright,8)}` },
  { id: 'library-capsule', width: 600, height: 900, usage: 'Steam library capsule', body: () => `${backdrop(600,900)}${question(33,372,.87,-12)}${microphone(482,444,.8,13)}${phone(22,687,.75,-16)}${gavel(452,763,.8,16)}${character(65,346,1.39,2)}${logo({x:43,y:78,scale:1.29})}${burst(513,359,.41,C.bright,8)}` },
  { id: 'library-hero', width: 3840, height: 1240, usage: 'Steam library hero artwork, no title or text', body: () => `${backdrop(3840,1240,{hero:true})}${phone(343,712,2.5,-14)}${question(1390,312,2.3,-14)}${gavel(1905,850,2.2,-21)}${microphone(3405,657,2.8,18)}${character(2390,20,3.2,5)}${burst(2210,265,1.1,C.bright,10)}${burst(3610,325,.65,'#9c4861',10)}` },
  { id: 'library-logo', width: 1280, height: 720, usage: 'Steam library logo, transparent background', transparent: true, body: () => logo({x:100,y:108,scale:2.7,shadow:true}) },
];

const manifest = {
  title: 'EN VRILLE !',
  license: 'MIT',
  copyright: 'Copyright (c) 2026 Empereur Rubis',
  palette: C,
  generator: 'node scripts/generate-store-assets.mjs',
  originalArt: 'Vrill and custom outlined lettering; no external fonts or licensed stock assets.',
  specifications: {
    overview: 'https://partner.steamgames.com/doc/store/assets',
    store: 'https://partner.steamgames.com/doc/store/assets/standard',
    library: 'https://partner.steamgames.com/doc/store/assets/libraryassets',
    rules: 'https://partner.steamgames.com/doc/store/assets/rules',
    verified: '2026-11-01',
  },
  assets: [],
};
for (const asset of assets) {
  const contents = svg(asset.width, asset.height, asset.body());
  if (/<text\b/.test(contents)) throw new Error('Outlined artwork must not depend on fonts.');
  await writeFile(resolve(sourceDir, `${asset.id}.svg`), contents);
  const image = new Resvg(contents, { font: { loadSystemFonts: false }, fitTo: { mode: 'original' } }).render();
  if (image.width !== asset.width || image.height !== asset.height) throw new Error(`${asset.id}: incorrect output dimensions`);
  if (asset.transparent && image.pixels[3] !== 0) throw new Error(`${asset.id}: expected transparent corner`);
  const png = image.asPng();
  await writeFile(resolve(outputDir, `${asset.id}.png`), png);
  manifest.assets.push({ id: asset.id, source: `source/${asset.id}.svg`, file: `assets/${asset.id}.png`, width: asset.width, height: asset.height, transparent: Boolean(asset.transparent), usage: asset.usage, sha256: createHash('sha256').update(png).digest('hex') });
  process.stdout.write(`${asset.id}: ${image.width}×${image.height}\n`);
}
await writeFile(resolve(sourceDir, 'brand-logo.svg'), svg(440,215,logo({x:16,y:17,scale:1,rotate:-4,shadow:true})));
await writeFile(resolve(root, 'marketing/manifest.json'), `${JSON.stringify(manifest,null,2)}\n`);
