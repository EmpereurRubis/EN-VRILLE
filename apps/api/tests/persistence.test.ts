import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { CONTENT } from "@en-vrille/content";
import { AVATARS } from "@en-vrille/shared";
import { GameEngine } from "../src/engine.js";
import { FileStore, PostgresStore } from "../src/store.js";

describe("persistance fichier de développement", () => {
  it("sauvegarde atomiquement les sessions, scores et contenus", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vrille-store-"));
    try {
      const store = new FileStore(directory),
        engine = new GameEngine({ store });
      await engine.initialize();
      const { room, session } = engine.create("Persistant", AVATARS[0]!);
      await engine.flush();
      room.players[0]!.score = 650;
      await store.saveRoom(room);
      await engine.updateContent(CONTENT.slice(0, 5));
      await store.close();
      const second = new GameEngine({ store: new FileStore(directory) });
      await second.initialize();
      const restored = second.resume(session);
      expect(restored.players[0]!.score).toBe(650);
      expect(second.content).toHaveLength(5);
      expect(
        JSON.stringify((await new FileStore(directory).load()).rooms),
      ).not.toContain(session.token);
      await second.flush();
    } finally {
      const target = resolve(directory),
        parent = resolve(tmpdir()) + sep;
      if (
        !target.startsWith(parent) ||
        !basename(target).startsWith("vrille-store-")
      )
        throw new Error(
          "Refus de nettoyer un dossier hors du répertoire de test.",
        );
      await rm(target, { recursive: true, force: true });
    }
  });
});
describe.skipIf(!process.env.TEST_DATABASE_URL)("PostgreSQL réel", () => {
  it("rejoue la migration puis restaure sessions, scores et banque administrée", async () => {
    const first = new PostgresStore(process.env.TEST_DATABASE_URL),
      engine = new GameEngine({ store: first });
    await engine.initialize();
    const originalContent = structuredClone(engine.content);
    const { room, session } = engine.create(`PG-${Date.now()}`, AVATARS[0]!);
    try {
      await engine.flush();
      room.players[0]!.score = 725;
      room.players[0]!.history.push({
        gameId: "mythos",
        points: 725,
        reason: "Sauvegarde PostgreSQL",
      });
      await first.saveRoom(room);
      await first.saveContent(CONTENT.slice(0, 8));
      const secondStore = new PostgresStore(process.env.TEST_DATABASE_URL),
        second = new GameEngine({ store: secondStore });
      try {
        await second.initialize();
        const restored = second.resume(session);
        expect(restored.players[0]!.score).toBe(725);
        expect(restored.players[0]!.history[0]?.points).toBe(725);
        expect(second.content).toHaveLength(8);
        await second.flush();
      } finally {
        await secondStore.close();
      }
    } finally {
      await first.deleteRoom(room.code);
      await first.saveContent(originalContent);
      await first.close();
    }
  });
});
