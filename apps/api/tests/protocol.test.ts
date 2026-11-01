import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { io, type Socket } from "socket.io-client";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { AVATARS, DEFAULT_CONFIG, PROTOCOL_VERSION } from "@en-vrille/shared";
import type { Ack } from "@en-vrille/shared";
import { createGameServer } from "../src/server.js";
import { MemoryStore } from "../src/store.js";

const running: Awaited<ReturnType<typeof createGameServer>>[] = [];
const clients: Socket[] = [];
const directories: string[] = [];
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ALLOWED_ORIGINS", "");
});
afterEach(async () => {
  for (const client of clients.splice(0)) client.disconnect();
  for (const server of running.splice(0)) await server.close();
  for (const directory of directories.splice(0)) {
    const target = resolve(directory);
    if (!target.startsWith(resolve(tmpdir()) + sep) || !basename(target).startsWith("vrille-protocol-"))
      throw new Error("Refus de nettoyer un dossier hors du répertoire de test.");
    await rm(target, { recursive: true, force: true });
  }
  vi.unstubAllEnvs();
});
async function server() {
  const directory = await mkdtemp(join(tmpdir(), "vrille-protocol-"));
  directories.push(directory);
  const api = await createGameServer({
    store: new MemoryStore(), autoTick: false, publicUrl: "https://envrille.erubis.fr",
    sessionSecret: "production-test-only-session-secret-32-characters",
    uploadDirectory: directory, logger: () => {},
  });
  running.push(api);
  return { api, url: await api.listen(0, "127.0.0.1") };
}
async function connect(url: string, auth?: Record<string, unknown>, origin = "app://game") {
  const socket = io(url, {
    auth, transports: ["websocket"], forceNew: true, reconnection: false,
    extraHeaders: { Origin: origin }, timeout: 2000,
  });
  clients.push(socket);
  await new Promise<void>((done, reject) => {
    socket.once("connect", done); socket.once("connect_error", reject);
  });
  return socket;
}
const event = (socket: Socket, name: string, data: unknown = {}) => new Promise<Ack>((done, reject) => {
  socket.timeout(2000).emit(name, data, (error: Error | null, ack: Ack) => error ? reject(error) : done(ack));
});

describe("protocole partagé et origine de l'application PC", () => {
  it("annonce le protocole dans les sondes et accepte le préflight de l'origine PC exacte en production", async () => {
    const { url } = await server();
    expect(PROTOCOL_VERSION).toBe(1);
    for (const path of ["/health", "/api/health", "/ready", "/api/ready"]) {
      const response = await fetch(`${url}${path}`, { headers: { Origin: "app://game" } });
      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBe("app://game");
      expect(await response.json()).toMatchObject({ ok: true, protocolVersion: 1 });
    }
    const preflight = await fetch(`${url}/api/catalog`, {
      method: "OPTIONS",
      headers: { Origin: "app://game", "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "Content-Type" },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("app://game");
    expect(preflight.headers.get("access-control-allow-methods")).toContain("GET");
    expect(preflight.headers.get("access-control-allow-headers")).toContain("Content-Type");
  });

  it.each(["null", "*", "file://", "app://other", "app://game.evil", "app://game/", "http://untrusted.example"])(
    "refuse l'origine HTTP et WebSocket %s", async (origin) => {
      const { url } = await server();
      const response = await fetch(`${url}/api/health`, { headers: { Origin: origin } });
      expect(response.status).toBe(403);
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
      await expect(connect(url, { protocolVersion: 1, clientKind: "desktop" }, origin)).rejects.toThrow();
    },
  );

  it.each([undefined, { protocolVersion: 1, clientKind: "desktop" }, { protocolVersion: 1, clientKind: "web" }])(
    "accepte les clients compatibles et les clients historiques : %j", async (auth) => {
      const { url } = await server();
      const client = await connect(url, auth);
      const created = await event(client, "room:create", { name: "Client compatible", avatar: AVATARS[0] });
      expect(created.ok).toBe(true); expect(created.room?.phase).toBe("lobby");
    },
  );

  it.each([0, 2, -1, "1", null])("refuse une version incompatible %j avec une erreur exploitable", async (version) => {
    const { api, url } = await server();
    await expect(connect(url, { protocolVersion: version, clientKind: "desktop" })).rejects.toMatchObject({
      message: expect.stringContaining("incompatible"), data: { code: "PROTOCOL_MISMATCH", supportedProtocol: 1 },
    });
    expect(api.engine.rooms.size).toBe(0);
  });

  it("fait jouer le PC local et les navigateurs sans exposer les réponses ni missions privées", async () => {
    const { api, url } = await server();
    const desktop = await connect(url, { protocolVersion: 1, clientKind: "desktop" });
    const web = await Promise.all([
      connect(url, { protocolVersion: 1, clientKind: "web" }, "https://envrille.erubis.fr"),
      connect(url, undefined, "https://envrille.erubis.fr"),
      connect(url, { protocolVersion: 1, clientKind: "web" }, "https://envrille.erubis.fr"),
    ]);
    const created = await event(desktop, "room:create", { name: "Animateur PC", avatar: AVATARS[0], hostPlays: false });
    const code = created.session!.code;
    const joined: Ack[] = [];
    for (let i = 0; i < web.length; i++) {
      joined.push(await event(web[i]!, "room:join", { code, name: `Téléphone ${i}`, avatar: AVATARS[i + 1] }));
      await event(web[i]!, "room:ready", { ready: true });
    }
    await event(desktop, "room:configure", {
      ...structuredClone(DEFAULT_CONFIG), playlist: [{ gameId: "mythos", rounds: 1 }], secretRoles: true,
    });
    const started = await event(desktop, "room:start");
    expect(started.room!.me.secretMission).toBeUndefined();
    for (let step = 0; step < 3; step++) await event(desktop, "room:advance");
    await event(web[0]!, "room:action", { type: "answer", text: "Réponse privée du téléphone" });
    const room = api.engine.getRoom(code);
    const hostView = api.engine.snapshot(room, created.session!.playerId);
    const otherView = api.engine.snapshot(room, joined[1]!.session!.playerId);
    expect(hostView.progress[0]).toMatchObject({ completed: 1, total: 3 });
    expect(JSON.stringify(hostView)).not.toContain("Réponse privée du téléphone");
    expect(JSON.stringify(otherView)).not.toContain("Réponse privée du téléphone");
    expect(hostView.me.secretMission).toBeUndefined();
    expect(otherView.me.secretMission).toBeDefined();
    expect(JSON.stringify(hostView)).not.toContain("tokenHash");
  });
});
