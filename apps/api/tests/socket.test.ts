import { afterEach, describe, expect, it } from "vitest";
import { io, type Socket } from "socket.io-client";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { AVATARS, DEFAULT_CONFIG } from "@en-vrille/shared";
import type { Ack } from "@en-vrille/shared";
import { createGameServer } from "../src/server.js";
import { MemoryStore } from "../src/store.js";

const running: Awaited<ReturnType<typeof createGameServer>>[] = [],
  clients: Socket[] = [],
  directories: string[] = [];
afterEach(async () => {
  for (const client of clients.splice(0)) client.disconnect();
  for (const server of running.splice(0)) await server.close();
  for (const directory of directories.splice(0)) {
    const target = resolve(directory),
      parent = resolve(tmpdir()) + sep;
    if (
      !target.startsWith(parent) ||
      !basename(target).startsWith("vrille-api-")
    )
      throw new Error(
        "Refus de nettoyer un dossier hors du répertoire de test.",
      );
    await rm(target, { recursive: true, force: true });
  }
});
async function connect(url: string) {
  const client = io(url, {
    transports: ["websocket"],
    forceNew: true,
    reconnection: false,
  });
  clients.push(client);
  await new Promise<void>((done, reject) => {
    client.once("connect", done);
    client.once("connect_error", reject);
  });
  return client;
}
const event = (socket: Socket, name: string, data: unknown = {}) =>
  new Promise<Ack>((done, reject) => {
    socket
      .timeout(3000)
      .emit(name, data, (error: Error | null, result: Ack) =>
        error ? reject(error) : done(result),
      );
  });
async function server() {
  const directory = await mkdtemp(join(tmpdir(), "vrille-api-"));
  directories.push(directory);
  const server = await createGameServer({
    store: new MemoryStore(),
    autoTick: false,
    adminToken: "admin-test-token-123456789",
    uploadDirectory: directory,
    mediaDirectory: resolve(process.cwd(), "packages/content/media"),
    logger: () => {},
  });
  running.push(server);
  return { server, url: await server.listen(0, "127.0.0.1") };
}

describe("Socket.IO multijoueur réel et HTTP", () => {
  it("joue de trois navigateurs au podium, protège les salons et reprend la session", async () => {
    const { server: api, url } = await server();
    const sockets = await Promise.all([
      connect(url),
      connect(url),
      connect(url),
      connect(url),
    ]);
    const created = await event(sockets[0]!, "room:create", {
      name: "Alice",
      avatar: AVATARS[0],
    });
    expect(created.ok).toBe(true);
    const code = created.session!.code;
    const joined = await Promise.all(
      [1, 2].map((i) =>
        event(sockets[i]!, "room:join", {
          code,
          name: `Ami ${i}`,
          avatar: AVATARS[i],
        }),
      ),
    );
    const other = await event(sockets[3]!, "room:create", {
      name: "Salon privé",
      avatar: AVATARS[3],
    });
    const ids = [
      created.session!.playerId,
      ...joined.map((j) => j.session!.playerId),
    ];
    expect(
      (await event(sockets[1]!, "room:configure", DEFAULT_CONFIG)).ok,
    ).toBe(false);
    expect(
      (
        await event(sockets[0]!, "room:configure", {
          ...structuredClone(DEFAULT_CONFIG),
          playlist: [{ gameId: "mythos", rounds: 1 }],
        })
      ).ok,
    ).toBe(true);
    await Promise.all(
      [1, 2].map((i) => event(sockets[i]!, "room:ready", { ready: true })),
    );
    expect((await event(sockets[0]!, "room:start")).ok).toBe(true);
    await event(sockets[0]!, "room:advance");
    await event(sockets[0]!, "room:action", {
      type: "answer",
      text: "Le secret du salon A",
    });
    expect(
      (
        await event(sockets[3]!, "room:action", {
          type: "answer",
          text: "Intrusion",
          playerId: ids[0],
        })
      ).ok,
    ).toBe(false);
    expect(
      JSON.stringify(
        api.engine.snapshot(
          api.engine.getRoom(other.session!.code),
          other.session!.playerId,
        ),
      ),
    ).not.toContain("Le secret");
    await event(sockets[1]!, "room:action", {
      type: "answer",
      text: "Réponse B",
    });
    const last = await event(sockets[2]!, "room:action", {
      type: "answer",
      text: "Réponse C",
    });
    expect(last.room!.phase).toBe("voting");
    expect(last.room!.round!.answers.every((a) => !a.authorId)).toBe(true);
    const real = api.engine.getRoom(code);
    const own = real.round!.answers.find((a) => a.authorId === ids[0])!;
    expect(
      (
        await event(sockets[0]!, "room:action", {
          type: "vote",
          targetId: own.id,
        })
      ).ok,
    ).toBe(false);
    for (let i = 0; i < 3; i++)
      await event(sockets[i]!, "room:action", {
        type: "vote",
        targetId: real.round!.answers.find((a) => a.authorId !== ids[i])!.id,
      });
    const result = await event(sockets[0]!, "room:advance");
    expect(result.room!.phase).toBe("results");
    expect(result.room!.players.some((p) => p.score > 0)).toBe(true);
    await event(sockets[0]!, "room:advance");
    expect(real.phase).toBe("podium");
    sockets[1]!.disconnect();
    const resumed = await connect(url);
    expect((await event(resumed, "room:resume", joined[0]!.session)).ok).toBe(
      true,
    );
    expect(
      (
        await event(await connect(url), "room:resume", {
          ...joined[0]!.session,
          token: "z".repeat(43),
        })
      ).ok,
    ).toBe(false);
  });
  it("retourne catalogue et health et protège CRUD/admin média", async () => {
    const { url } = await server();
    expect((await fetch(`${url}/health`)).status).toBe(200);
    expect((await fetch(`${url}/ready`)).status).toBe(200);
    const catalog = (await (await fetch(`${url}/api/catalog`)).json()) as {
      total: number;
      counts: Record<string, number>;
    };
    expect(catalog.total).toBeGreaterThanOrEqual(380);
    expect(catalog.counts.captions).toBeGreaterThanOrEqual(20);
    expect((await fetch(`${url}/api/admin/content`)).status).toBe(401);
    const headers = {
      Authorization: "Bearer admin-test-token-123456789",
      "Content-Type": "application/json",
    };
    const created = await fetch(`${url}/api/admin/content`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        gameId: "mythos",
        category: "test",
        prompt: "Pourquoi les tests veulent-ils devenir humoristes ?",
      }),
    });
    expect(created.status).toBe(201);
    const { item } = (await created.json()) as { item: { id: string } };
    const updated = await fetch(`${url}/api/admin/content/${item.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        gameId: "mythos",
        category: "test",
        prompt:
          "Pourquoi les tests passent-ils leur vie à vérifier les autres ?",
      }),
    });
    expect(updated.status).toBe(200);
    expect(
      (
        await fetch(`${url}/api/admin/content/${item.id}`, {
          method: "DELETE",
          headers,
        })
      ).status,
    ).toBe(200);
    const invalid = await fetch(`${url}/api/admin/media`, {
      method: "POST",
      headers,
      body: JSON.stringify({ dataUrl: "data:image/png;base64,ZmFrZQ==" }),
    });
    expect(invalid.status).toBe(400);
    const uploaded = await fetch(`${url}/api/admin/media`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        dataUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Y7sAAAAASUVORK5CYII=",
      }),
    });
    expect(uploaded.status).toBe(201);
    const media = (await uploaded.json()) as { mediaUrl: string };
    expect((await fetch(`${url}${media.mediaUrl}`)).status).toBe(200);
    expect(
      (
        await fetch(`${url}/api/catalog`, {
          headers: { Origin: "https://untrusted.example" },
        })
      ).status,
    ).toBe(403);
  });
  it("remplace proprement une connexion lorsque le même jeton ouvre un autre onglet", async () => {
    const { server: api, url } = await server();
    const first = await connect(url),
      created = await event(first, "room:create", {
        name: "Alice",
        avatar: AVATARS[0],
      });
    const disconnected = new Promise<void>((done) =>
      first.once("disconnect", () => done()),
    );
    const second = await connect(url);
    expect((await event(second, "room:resume", created.session)).ok).toBe(true);
    await disconnected;
    expect(first.connected).toBe(false);
    expect(
      api.engine.getPlayer(
        api.engine.getRoom(created.session!.code),
        created.session!.playerId,
      ).connected,
    ).toBe(true);
    expect((await event(second, "room:ready", { ready: false })).ok).toBe(true);
  });
});
