import { describe, expect, it } from "vitest";
import { AVATARS, DEFAULT_CONFIG } from "@en-vrille/shared";
import type { PlaylistItem } from "@en-vrille/shared";
import { GameEngine } from "../src/engine.js";
import { MemoryStore } from "../src/store.js";

async function setup(
  playlist: PlaylistItem[] = [{ gameId: "mythos", rounds: 1 }],
  count = 5,
) {
  let now = 1_000_000;
  const store = new MemoryStore(),
    engine = new GameEngine({ store, now: () => now, random: () => 0 });
  await engine.initialize();
  const first = engine.create("Alice", AVATARS[0]!);
  const sessions = [first.session];
  for (let i = 1; i < count; i++) {
    const added = engine.join(first.room.code, `Joueur ${i}`, AVATARS[i]!);
    sessions.push(added.session);
    engine.ready(first.room.code, added.session.playerId, true);
  }
  engine.configure(first.room.code, first.session.playerId, {
    ...structuredClone(DEFAULT_CONFIG),
    playlist,
  });
  return {
    engine,
    store,
    room: first.room,
    sessions,
    host: first.session.playerId,
    clock: (ms: number) => {
      now += ms;
      engine.tick();
    },
  };
}

describe("moteur autoritaire", () => {
  it("cache les réponses et leurs auteurs, protège l’hôte, refuse doubles réponses et auto-vote", async () => {
    const { engine, room, host, sessions } = await setup();
    const ids = sessions.map((s) => s.playerId);
    expect(() => engine.start(room.code, ids[1]!)).toThrow("réservée");
    engine.start(room.code, host);
    expect(() =>
      engine.action(room.code, host, { type: "answer", text: "trop tôt" }),
    ).toThrow();
    engine.advance(room.code, host);
    engine.action(room.code, host, {
      type: "answer",
      text: "La réponse secrète d’Alice",
    });
    expect(() =>
      engine.action(room.code, host, { type: "answer", text: "bis" }),
    ).toThrow("déjà");
    const privateSnapshot = engine.snapshot(room, ids[1]!);
    expect(JSON.stringify(privateSnapshot)).not.toContain("La réponse secrète");
    expect(JSON.stringify(privateSnapshot)).not.toContain("tokenHash");
    for (const id of ids.slice(1))
      engine.action(room.code, id, { type: "answer", text: `Réponse ${id}` });
    expect(room.phase).toBe("voting");
    expect(
      engine.snapshot(room, host).round!.answers.every((a) => !a.authorId),
    ).toBe(true);
    expect(() =>
      engine.action(room.code, host, {
        type: "vote",
        targetId: room.round!.answers.find((a) => a.authorId === host)!.id,
      }),
    ).toThrow();
    for (const id of ids) {
      const answer = room.round!.answers.find((a) => a.authorId !== id)!;
      engine.action(room.code, id, { type: "vote", targetId: answer.id });
    }
    expect(engine.snapshot(room, host).round?.voteCounts).toBeUndefined();
    engine.advance(room.code, host);
    expect(room.phase).toBe("results");
    expect(
      engine.snapshot(room, host).round!.answers.every((a) => !!a.authorId),
    ).toBe(true);
    const total = room.players.reduce((n, p) => n + p.score, 0);
    expect(total).toBeGreaterThan(0);
    engine.advance(room.code, host);
    expect(room.phase).toBe("podium");
    expect(room.players.reduce((n, p) => n + p.score, 0)).toBe(total);
    await engine.flush();
  });
  it("suspend réellement les timers et reprend sans raccourcir le temps restant", async () => {
    const { engine, room, host, clock } = await setup();
    engine.start(room.code, host);
    clock(3000);
    engine.pause(room.code, host, true);
    clock(120_000);
    expect(room.phase).toBe("intro");
    expect(room.deadline).toBeNull();
    engine.pause(room.code, host, false);
    clock(4999);
    expect(room.phase).toBe("intro");
    clock(1);
    expect(room.phase).toBe("writing");
  });
  it("admet les arrivants en spectateur et les intègre à la manche suivante", async () => {
    const { engine, room, host } = await setup([
      { gameId: "mythos", rounds: 2 },
    ]);
    engine.start(room.code, host);
    const late = engine.join(room.code, "Retardataire", AVATARS[9]!);
    expect(
      engine
        .snapshot(room, late.session.playerId)
        .players.find((p) => p.id === late.session.playerId)?.spectator,
    ).toBe(true);
    engine.advance(room.code, host);
    expect(() =>
      engine.action(room.code, late.session.playerId, {
        type: "answer",
        text: "Coucou",
      }),
    ).toThrow("prochaine");
    engine.advance(room.code, host);
    engine.advance(room.code, host);
    engine.advance(room.code, host);
    expect(room.roundNumber).toBe(2);
    expect(room.round?.participantIds).toContain(late.session.playerId);
  });
  it("les absents ne bloquent ni la collecte ni la clôture automatique", async () => {
    const { engine, room, host, sessions, clock } = await setup();
    engine.start(room.code, host);
    engine.advance(room.code, host);
    engine.disconnect(room.code, sessions[4]!.playerId);
    for (const session of sessions.slice(0, 4))
      engine.action(room.code, session.playerId, {
        type: "answer",
        text: "Réponse présente",
      });
    expect(room.phase).toBe("voting");
    clock(room.config.voteSeconds * 1000);
    expect(room.phase).toBe("results");
    expect(room.players.every((p) => p.score === 0)).toBe(true);
  });
  it("remplace les inventions manquantes et distribue sans auto-attribution", async () => {
    const { engine, room, host } = await setup([
      { gameId: "pitch", rounds: 1, pitchMode: "invented" },
    ]);
    engine.start(room.code, host);
    engine.advance(room.code, host);
    engine.action(room.code, host, {
      type: "product",
      name: "Mon grille-pain déprimé",
      description: "Le pain ressort avec des questions existentielles.",
    });
    engine.advance(room.code, host);
    expect(room.phase).toBe("prepare");
    expect(room.round!.products).toHaveLength(5);
    expect(new Set(room.round!.products.map((p) => p.sellerId)).size).toBe(5);
    expect(room.round!.products.every((p) => p.creatorId !== p.sellerId)).toBe(
      true,
    );
    expect(
      room.round!.products.filter((p) => p.creatorId === host),
    ).toHaveLength(1);
  });
  it("respecte les votes définitifs, l’isolation des salons et les jetons de reconnexion", async () => {
    const { engine, room, host, sessions } = await setup([
      { gameId: "who", rounds: 1 },
    ]);
    engine.configure(room.code, host, {
      ...room.config,
      allowVoteChange: false,
    });
    engine.start(room.code, host);
    engine.advance(room.code, host);
    engine.action(room.code, host, {
      type: "vote",
      targetId: sessions[1]!.playerId,
    });
    expect(() =>
      engine.action(room.code, host, {
        type: "vote",
        targetId: sessions[2]!.playerId,
      }),
    ).toThrow("déjà");
    const other = engine.create("Autre hôte", AVATARS[0]!);
    expect(() =>
      engine.action(room.code, host, {
        type: "vote",
        targetId: other.session.playerId,
      }),
    ).toThrow();
    expect(() =>
      engine.resume({ ...sessions[0]!, token: "x".repeat(43) }),
    ).toThrow("jeton");
    engine.disconnect(room.code, host);
    engine.resume(sessions[0]!);
    expect(engine.getPlayer(room, host).connected).toBe(true);
  });
  it("masque aussi historique, deltas et points de manche lorsque le classement est secret", async () => {
    const { engine, room, host, sessions } = await setup([
      { gameId: "who", rounds: 1 },
    ]);
    engine.configure(room.code, host, { ...room.config, leaderboard: "final" });
    engine.start(room.code, host);
    engine.advance(room.code, host);
    for (const s of sessions)
      engine.action(room.code, s.playerId, {
        type: "vote",
        targetId: s.playerId === host ? sessions[1]!.playerId : host,
      });
    engine.advance(room.code, host);
    const snapshot = engine.snapshot(room, host);
    expect(snapshot.scoresVisible).toBe(false);
    expect(
      snapshot.players.every(
        (p) => p.score === 0 && p.delta === 0 && p.history.length === 0,
      ),
    ).toBe(true);
    expect(snapshot.round?.results.every((r) => r.points === 0)).toBe(true);
    engine.advance(room.code, host);
    expect(engine.snapshot(room, host).players.some((p) => p.score > 0)).toBe(
      true,
    );
  });
  it("fait tourner les rôles et acquitte en cas d’égalité sans récompenser les jurés majoritaires", async () => {
    const { engine, room, host, sessions } = await setup(
      [{ gameId: "court", rounds: 2 }],
      6,
    );
    engine.start(room.code, host);
    const firstRoles = structuredClone(room.round!.roles!);
    engine.advance(room.code, host);
    engine.action(room.code, host, {
      type: "answer",
      text: "Notes privées pour ma plaidoirie",
    });
    engine.advance(room.code, host);
    expect(engine.snapshot(room, sessions[1]!.playerId).round!.answers).toEqual(
      [],
    );
    expect(engine.snapshot(room, host).me.answer).toBe(
      "Notes privées pour ma plaidoirie",
    );
    for (let i = 0; i < 4; i++) engine.advance(room.code, host);
    expect(room.phase).toBe("voting");
    const jurors = room.round!.roles!.jurors;
    expect(jurors).toHaveLength(2);
    expect(() =>
      engine.action(room.code, firstRoles.accused, {
        type: "verdict",
        guilty: true,
      }),
    ).toThrow("jurés");
    engine.action(room.code, jurors[0]!, { type: "verdict", guilty: true });
    engine.action(room.code, jurors[1]!, { type: "verdict", guilty: false });
    engine.advance(room.code, host);
    expect(room.round!.verdict).toBe("innocent");
    expect(jurors.every((id) => engine.getPlayer(room, id).score === 0)).toBe(
      true,
    );
    expect(
      JSON.stringify(engine.snapshot(room, sessions[1]!.playerId)),
    ).not.toContain("Notes privées");
    engine.advance(room.code, host);
    expect(room.round!.roles!.accused).not.toBe(firstRoles.accused);
    expect(sessions).toHaveLength(6);
  });
  it("joue les cinq jeux et les deux modes commerciaux jusqu’au podium, puis rejoue", async () => {
    const playlist: PlaylistItem[] = [
      { gameId: "mythos", rounds: 1 },
      { gameId: "pitch", rounds: 1, pitchMode: "random" },
      { gameId: "pitch", rounds: 1, pitchMode: "invented" },
      { gameId: "court", rounds: 1 },
      { gameId: "who", rounds: 1 },
      { gameId: "captions", rounds: 1 },
    ];
    const { engine, room, host, sessions } = await setup(playlist);
    engine.start(room.code, host);
    let safety = 0;
    const seen = new Set<string>();
    while (room.phase !== "podium" && safety++ < 120) {
      const round = room.round!,
        phase = room.phase;
      if (phase === "writing") {
        for (const id of round.participantIds)
          engine.action(
            room.code,
            id,
            round.gameId === "pitch"
              ? {
                  type: "product",
                  name: `Objet de ${id}`,
                  description: "Une invention douteuse.",
                }
              : { type: "answer", text: `La réponse de ${id}` },
          );
        if (round.gameId === "pitch") {
          expect(round.products.every((p) => p.creatorId !== p.sellerId)).toBe(
            true,
          );
          expect(new Set(round.products.map((p) => p.creatorId)).size).toBe(5);
          for (const id of round.participantIds)
            expect(
              engine.snapshot(room, id).me.product?.creatorId,
            ).toBeUndefined();
        }
      } else if (phase === "voting") {
        seen.add(round.gameId);
        for (const id of round.participantIds) {
          if (round.gameId === "pitch")
            for (const p of round.products.filter((p) => p.sellerId !== id))
              engine.action(room.code, id, {
                type: "rate",
                targetId: p.sellerId!,
                humor: 4,
                conviction: 5,
                creativity: 4,
              });
          else if (round.gameId === "court") {
            if (round.roles!.jurors.includes(id))
              engine.action(room.code, id, {
                type: "verdict",
                guilty: true,
                bestPlayerId: round.participantIds.find((p) => p !== id),
              });
            else
              engine.action(room.code, id, {
                type: "vote",
                targetId: round.participantIds.find((p) => p !== id)!,
              });
          } else if (round.gameId === "who")
            engine.action(room.code, id, {
              type: "vote",
              targetId: round.participantIds.find((p) => p !== id)!,
            });
          else
            engine.action(room.code, id, {
              type: "vote",
              targetId: round.answers.find((a) => a.authorId !== id)!.id,
            });
        }
        engine.advance(room.code, host);
      } else engine.advance(room.code, host);
    }
    expect(safety).toBeLessThan(120);
    expect([...seen].sort()).toEqual([
      "captions",
      "court",
      "mythos",
      "pitch",
      "who",
    ]);
    expect(room.players.some((p) => p.score > 0)).toBe(true);
    expect(engine.snapshot(room, host).scoresVisible).toBe(true);
    engine.replay(room.code, host);
    expect(room.phase).toBe("lobby");
    expect(
      room.players.every((p) => p.score === 0 && p.history.length === 0),
    ).toBe(true);
    engine.resume(sessions[0]!);
    await engine.flush();
  });
  it("restaure scores, réponses privées et identités avec une soirée mise en pause", async () => {
    const { engine, store, room, host, sessions } = await setup();
    engine.start(room.code, host);
    engine.advance(room.code, host);
    engine.action(room.code, host, { type: "answer", text: "Persistant" });
    await engine.flush();
    const restored = new GameEngine({ store, now: () => 1_000_100 });
    await restored.initialize();
    const saved = restored.getRoom(room.code);
    expect(saved.paused).toBe(true);
    expect(saved.players.every((p) => !p.connected)).toBe(true);
    restored.resume(sessions[0]!);
    expect(restored.snapshot(saved, host).me.answer).toBe("Persistant");
    expect(
      restored.snapshot(saved, sessions[1]!.playerId).me.answer,
    ).toBeUndefined();
  });
  it("invalide les jetons sauvegardés lorsque le secret de session change", async () => {
    const store = new MemoryStore(),
      first = new GameEngine({
        store,
        sessionSecret: "ancien-secret-aleatoire-de-developpement",
      });
    await first.initialize();
    const { session } = first.create("Alice", AVATARS[0]!);
    await first.flush();
    const rotated = new GameEngine({
      store,
      sessionSecret: "nouveau-secret-aleatoire-de-developpement",
    });
    await rotated.initialize();
    expect(() => rotated.resume(session)).toThrow("jeton incorrect");
    expect(JSON.stringify(await store.load())).not.toContain(session.token);
  });
});
