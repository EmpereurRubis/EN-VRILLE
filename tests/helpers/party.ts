import assert from "node:assert/strict";
import type { TestContext } from "node:test";
import { io, type Socket } from "socket.io-client";
import { AVATARS, DEFAULT_CONFIG, PROTOCOL_VERSION } from "../../packages/shared/src/index.ts";
import type { Ack, GameId, RoomConfig, RoomSnapshot, Session } from "../../packages/shared/src/index.ts";
import { createGameServer } from "../../apps/api/src/server.ts";
import { MemoryStore } from "../../apps/api/src/store.ts";

export interface Client {
  socket: Socket;
  session?: Session;
  last?: RoomSnapshot;
}

export async function fixture(t: TestContext) {
  let time = Date.now();
  const store = new MemoryStore();
  const errors: unknown[] = [];
  const server = await createGameServer({ store, autoTick: false, now: () => time,
    publicUrl: "http://localhost:5173", sessionSecret: "integration-test-secret-with-at-least-32-characters", logger: e => errors.push(e) });
  const url = await server.listen(0, "127.0.0.1");
  const clients: Client[] = [];
  t.after(async () => {
    for (const client of clients) client.socket.disconnect();
    await server.close();
    assert.deepEqual(errors, [], "unexpected server errors");
  });
  async function connect() {
    const socket = io(url, { autoConnect: false, transports: ["websocket"], reconnection: false,
      auth: { protocolVersion: PROTOCOL_VERSION } });
    const client: Client = { socket };
    clients.push(client);
    socket.on("room:state", room => { client.last = room; });
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("connect_error", reject);
      socket.connect();
    });
    return client;
  }
  function view(client: Client) {
    assert.ok(client.session, "client has a session");
    return server.engine.snapshot(server.engine.getRoom(client.session.code), client.session.clientId);
  }
  return { server, store, clients, connect, view,
    jump(ms: number) { time += ms; server.engine.tick(); },
    async create() {
      const display = await connect();
      const ack = await ok(display, "room:create", {});
      assert.ok(ack.session);
      return display;
    },
    async join(code: string, index: number) {
      const client = await connect();
      await ok(client, "room:join", { code, name: `Joueur ${index + 1}`, avatar: AVATARS[index % AVATARS.length] });
      return client;
    },
  };
}

export async function send(client: Client, event: string, payload: unknown = {}): Promise<Ack> {
  const ack = await new Promise<Ack>((resolve, reject) => {
    client.socket.timeout(5000).emit(event, payload, (error: Error | null, result: Ack) => error ? reject(error) : resolve(result));
  });
  if (ack.session) client.session = ack.session;
  if (ack.room) client.last = ack.room;
  return ack;
}

export async function ok(client: Client, event: string, payload: unknown = {}) {
  const ack = await send(client, event, payload);
  assert.equal(ack.ok, true, `${event}: ${ack.error || "request failed"}`);
  return ack;
}

export async function denied(client: Client, event: string, payload: unknown = {}) {
  const ack = await send(client, event, payload);
  assert.equal(ack.ok, false, `${event} should be rejected`);
  return ack;
}

export async function party(t: TestContext, gameId: GameId = "mythos", count = 5, config: Partial<RoomConfig> = {}) {
  const f = await fixture(t);
  const display = await f.create(), initial = f.view(display), code = initial.code;
  const players: Client[] = [];
  for (let index = 0; index < count; index++) players.push(await f.join(code, index));
  const host = players[0]!;
  assert.ok(initial.pairingCode);
  await ok(host, "room:claim-control", { pairingCode: initial.pairingCode });
  const configuration: RoomConfig = { ...structuredClone(DEFAULT_CONFIG),
    playlist: [{ gameId, rounds: 1, ...(gameId === "pitch" ? { pitchMode: "invented" as const } : {}) }],
    answerSeconds: 0, voteSeconds: 0, presentationSeconds: 0, autoAdvance: false,
    allowVoteChange: false, balanced: false, ...config };
  await ok(host, "room:configure", configuration);
  for (const player of players) await ok(player, "room:ready", { ready: true });
  async function advance(extra: Record<string, unknown> = {}) {
    const current = f.view(host);
    return ok(host, "room:advance", { transitionId: current.transitionId, ...extra });
  }
  async function start() {
    await ok(host, "room:start");
    let guard = 0;
    while (["party-intro", "intro", "rules"].includes(f.view(host).phase)) {
      assert.ok(++guard <= 5);
      await advance();
    }
  }
  return { ...f, display, players, host, code, configuration, advance, start };
}
