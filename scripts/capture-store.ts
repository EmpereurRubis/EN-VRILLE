import { _electron as electron, expect } from '@playwright/test';
import { io, type Socket } from 'socket.io-client';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { AVATARS, DEFAULT_CONFIG, PROTOCOL_VERSION, type Ack, type RoomSnapshot } from '@en-vrille/shared';

const serverUrl = process.argv[2] || 'http://127.0.0.1:3001';
const executablePath = resolve('apps/desktop/release/win-unpacked/EN-VRILLE.exe');
const output = resolve('marketing/screenshots');
const userData = await mkdtemp(join(tmpdir(), 'en-vrille-capture-'));
const clients: { socket: Socket; room?: RoomSnapshot; id?: string; last: number }[] = [];
const names = ['Camille', 'Alex', 'Sacha', 'Nora', 'Léo', 'Sam', 'Mika', 'Lou'];
let application: Awaited<ReturnType<typeof electron.launch>> | undefined;
async function send(client: typeof clients[number], event: string, data: unknown = {}) {
  await delay(Math.max(0, 170 - (Date.now() - client.last))); client.last = Date.now();
  const ack = await new Promise<Ack>((done, reject) => client.socket.timeout(10000).emit(event, data, (error: Error | null, value: Ack) => error ? reject(error) : done(value)));
  if (!ack.ok) throw new Error(`${event}: ${ack.error}`);
  if (ack.room) client.room = ack.room;
  if (ack.session) client.id = ack.session.playerId;
  return ack;
}
try {
  await mkdir(output, { recursive: true });
  const environment = { ...process.env, ENVRILLE_USER_DATA_DIR: userData, ENVRILLE_SERVER_URL: serverUrl };
  delete environment.ELECTRON_RUN_AS_NODE;
  application = await electron.launch({ executablePath, env: environment, timeout: 45000 });
  const page = await application.firstWindow();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.screenshot({ path: join(output, '00-menu-windows.png') });
  let code = '';
  for (let i = 0; i < names.length; i++) {
    const socket = io(serverUrl, { transports: ['websocket'], reconnection: false, forceNew: true, auth: { protocolVersion: PROTOCOL_VERSION, clientKind: i ? 'web' : 'desktop' }, ...(i ? {} : { extraHeaders: { Origin: 'app://game' } }) });
    const client: typeof clients[number] = { socket, last: 0 }; clients.push(client);
    socket.on('room:state', room => { client.room = room; });
    await new Promise<void>((done, reject) => { socket.once('connect', done); socket.once('connect_error', reject); });
    const ack = await send(client, i ? 'room:join' : 'room:create', { name: names[i], avatar: AVATARS[i], ...(i ? { code } : {}) });
    code ||= ack.session!.code;
    if (i) await send(client, 'room:ready', { ready: true });
  }
  const host = clients[0]!;
  await send(host, 'room:configure', { ...structuredClone(DEFAULT_CONFIG), answerSeconds: 180, voteSeconds: 120, autoAdvance: false, playlist: [
    { gameId: 'mythos', rounds: 1 }, { gameId: 'pitch', rounds: 1, pitchMode: 'random' }, { gameId: 'court', rounds: 1 }, { gameId: 'who', rounds: 1 }, { gameId: 'captions', rounds: 1 },
  ] });
  await page.goto(`app://game/?room=${code}&screen=1`);
  await page.getByRole('button', { name: 'Rejoindre le salon', exact: true }).click();
  await expect(page.locator('.show-stage')).toBeVisible();
  await send(host, 'room:start');
  const captured = new Set<string>();
  const answers = [
    'Les pigeons ont demandé un audit indépendant.', 'Le grille-pain avait convoqué une réunion.',
    'Un comité de chaussettes a refusé de commenter.', 'La photocopieuse préparait sa reconversion.',
    'C’était écrit en tout petit sur le fromage.', 'Les plantes vertes ont déposé un préavis.',
    'Le canapé revendique son droit au télétravail.', 'Un hamster dirigeait la commission d’enquête.',
  ];
  for (let guard = 0; guard < 150; guard++) {
    const room = host.room!, game = room.round?.gameId;
    await expect(page.getByTestId('phase')).toHaveAttribute('data-phase', room.phase);
    const capture = async (name: string) => { await page.screenshot({ path: join(output, name) }); captured.add(game!); };
    if (room.phase === 'podium') {
      await expect(page.locator('.show-final-ranking li')).toHaveCount(8, { timeout: 12000 });
      await page.screenshot({ path: join(output, '06-podium-windows.png') });
      break;
    }
    if (room.phase === 'reveal' && !captured.has(game!)) {
      await expect(page.locator('.show-reveal-answers > div').nth(1)).toBeVisible();
      if (game === 'captions') await expect(page.locator('.show-cinema blockquote')).toHaveCSS('opacity', '1');
      await capture(game === 'mythos' ? '01-mythos-windows.png' : '05-sous-titres-windows.png');
    }
    if (room.phase === 'presenting' && !captured.has(game!)) {
      await capture(game === 'pitch' ? '02-teleachat-windows.png' : '03-tribunal-windows.png');
    }
    if (room.phase === 'results' && game === 'who' && !captured.has(game)) {
      await expect(page.locator('.show-vote-bars > div')).toHaveCount(8);
      await capture('04-qui-parmi-nous-windows.png');
    }
    if (room.phase === 'writing') {
      for (const [i, client] of clients.entries()) await send(client, 'room:action', { type: 'answer', text: answers[i] });
      await expect.poll(() => host.room?.phase).not.toBe('writing');
    } else if (room.phase === 'prepare') {
      for (const client of clients) await send(client, 'room:action', { type: 'prepared' });
      await expect.poll(() => host.room?.phase).not.toBe('prepare');
    } else if (room.phase === 'voting') {
      for (const [i, client] of clients.entries()) {
        const snapshot = client.room!, round = snapshot.round!;
        if (game === 'pitch') {
          for (const product of round.products || []) if (product.sellerId !== client.id) await send(client, 'room:action', { type: 'rate', targetId: product.sellerId, humor: 3 + i % 3, conviction: 4, creativity: 4 });
        } else if (game === 'court') {
          await send(client, 'room:action', round.roles!.jurors.includes(client.id!)
            ? { type: 'verdict', guilty: false, bestPlayerId: round.roles!.defense }
            : { type: 'vote', targetId: clients[(i + 1) % clients.length]!.id });
        } else await send(client, 'room:action', { type: 'vote', targetId: game === 'who' ? clients[i ? 0 : 1]!.id : round.answers.find(a => a.id !== snapshot.me.answerId)!.id });
      }
      await expect.poll(() => host.room?.phase).not.toBe('voting');
    } else await send(host, 'room:advance');
  }
  if (captured.size !== 5 || host.room?.phase !== 'podium') throw new Error('Capture de la soirée incomplète.');
  await writeFile(join(output, 'manifest.json'), JSON.stringify({ capturedAt: new Date().toISOString(), platform: 'Windows x64', executable: 'EN-VRILLE.exe', renderer: 'app://game', width: 1920, height: 1080, players: 8, protocolVersion: PROTOCOL_VERSION, games: [...captured], source: 'Captures du véritable exécutable Windows pendant une partie de recette, sans retouche.' }, null, 2));
  console.log('Sept captures authentiques Windows 1920×1080 enregistrées dans marketing/screenshots.');
} finally {
  for (const client of clients) client.socket.disconnect();
  await application?.close();
  const target = resolve(userData);
  if (!target.startsWith(resolve(tmpdir()) + sep) || !basename(target).startsWith('en-vrille-capture-')) throw new Error('Dossier de nettoyage inattendu.');
  await rm(target, { recursive: true, force: true });
}
