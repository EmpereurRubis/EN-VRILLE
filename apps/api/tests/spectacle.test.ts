import { describe, expect, it } from "vitest";
import { AVATARS, DEFAULT_CONFIG } from "@en-vrille/shared";
import type { Phase, PlaylistItem } from "@en-vrille/shared";
import { GameEngine } from "../src/engine.js";
import { MemoryStore } from "../src/store.js";
import type { Room } from "../src/model.js";

async function setup(playlist: PlaylistItem[] = [{ gameId: "mythos", rounds: 1 }], count = 8) {
  let now = 1_000_000;
  const store = new MemoryStore();
  const engine = new GameEngine({ store, now: () => now, random: () => 0 });
  await engine.initialize();
  const { room, session } = engine.create("Alice", AVATARS[0]!);
  const sessions = [session], host = session.playerId;
  for (let i = 1; i < count; i++) {
    const added = engine.join(room.code, `Joueur ${i}`, AVATARS[i % AVATARS.length]!);
    sessions.push(added.session); engine.ready(room.code, added.session.playerId, true);
  }
  engine.configure(room.code, host, { ...structuredClone(DEFAULT_CONFIG), playlist });
  return {
    engine, store, room, sessions, host, ids: sessions.map((s) => s.playerId),
    clock: (ms: number) => { now += ms; engine.tick(); },
    until: (phase: Phase) => {
      for (let i = 0; room.phase !== phase && i < 80; i++) engine.advance(room.code, host);
      expect(room.phase).toBe(phase);
    },
  };
}
function answer(engine: GameEngine, room: Room, id: string, text = `Réponse de ${id}`) {
  engine.action(room.code, id, { type: "answer", text });
}

describe("spectacle multijoueur et quorum serveur", () => {
  it("synchronise huit joueurs de 3/8 à 4/8 et révèle les réponses avant le vote", async () => {
    const { engine, room, host, ids, until } = await setup();
    const stage = engine.join(room.code, "La scène", AVATARS[10]!, true);
    expect(engine.snapshot(room, host).progress[0]).toEqual({ kind: "ready", label: "Joueurs prêts", completed: 8, total: 8 });
    engine.start(room.code, host); expect(room.phase).toBe("party-intro"); until("writing");
    for (const id of ids.slice(0, 3)) answer(engine, room, id);
    expect(engine.snapshot(room, stage.session.playerId).progress[0]).toMatchObject({ completed: 3, total: 8 });
    answer(engine, room, ids[3]!);
    expect(engine.snapshot(room, host).progress[0]).toMatchObject({ completed: 4, total: 8 });
    expect(JSON.stringify(engine.snapshot(room, stage.session.playerId))).not.toContain(`Réponse de ${host}`);
    for (const id of ids.slice(4)) answer(engine, room, id);
    expect(room.phase).toBe("reveal");
    const publicAnswers = engine.snapshot(room, stage.session.playerId).round!.answers;
    expect(publicAnswers).toHaveLength(8); expect(publicAnswers.every((a) => !a.authorId)).toBe(true);
    expect(() => engine.action(room.code, host, { type: "vote", targetId: publicAnswers[0]!.id })).toThrow("ouvert");
    engine.advance(room.code, host); expect(room.phase).toBe("voting");
  });

  it("accepte la modification d'un vote avant clôture et ferme même allowVoteChange=true", async () => {
    const { engine, room, host, ids, until } = await setup([{ gameId: "who", rounds: 1 }]);
    engine.start(room.code, host); until("voting");
    engine.action(room.code, host, { type: "vote", targetId: ids[1]! });
    engine.action(room.code, host, { type: "vote", targetId: ids[2]! });
    expect(engine.snapshot(room, host).progress[0]).toMatchObject({ completed: 1, total: 8 });
    for (const id of ids.slice(1)) engine.action(room.code, id, { type: "vote", targetId: host });
    expect(room.phase).toBe("results");
    expect(room.round!.votes[host]).toBe(ids[2]);
    expect(() => engine.action(room.code, host, { type: "vote", targetId: ids[1]! })).toThrow("ouvert");
  });

  it("garde dix secondes de grâce puis restaure l'éligibilité à la phase suivante", async () => {
    const { engine, room, host, sessions, ids, clock, until } = await setup();
    engine.start(room.code, host); until("writing"); engine.disconnect(room.code, ids[7]!);
    for (const id of ids.slice(0, 7)) answer(engine, room, id);
    expect(engine.snapshot(room, host).progress[0]).toMatchObject({ completed: 7, total: 8 });
    clock(9999); expect(room.phase).toBe("writing");
    engine.resume(sessions[7]!); expect(engine.snapshot(room, ids[7]!).me.eligible).toBe(true);
    engine.disconnect(room.code, ids[7]!); clock(10_000); expect(room.phase).toBe("reveal");
    engine.resume(sessions[7]!); expect(engine.snapshot(room, ids[7]!).me.eligible).toBe(false);
    until("voting"); expect(engine.snapshot(room, ids[7]!).me.eligible).toBe(true);
    expect(engine.snapshot(room, host).progress[0]?.total).toBe(8);
  });

  it("protège le passage d'un joueur et actualise le dénominateur immédiatement", async () => {
    const { engine, room, host, ids, until } = await setup();
    engine.start(room.code, host); until("writing");
    for (const id of ids.slice(0, 3)) answer(engine, room, id);
    expect(() => engine.skipPlayer(room.code, ids[1]!, ids[7]!)).toThrow("réservée");
    engine.skipPlayer(room.code, host, ids[7]!);
    expect(engine.snapshot(room, host).progress[0]).toMatchObject({ completed: 3, total: 7 });
    expect(engine.snapshot(room, ids[7]!).me.eligible).toBe(false);
    expect(() => answer(engine, room, ids[7]!)).toThrow("passé");
    for (const id of ids.slice(3, 7)) answer(engine, room, id);
    expect(room.phase).toBe("reveal");
  });

  it.each(["pitch", "court"] as const)("ne coupe jamais l'oral %s à expiration du chrono", async (gameId) => {
    const { engine, room, host, ids, clock, until } = await setup([{ gameId, rounds: 1 }]);
    engine.start(room.code, host); until("prepare");
    for (const id of ids) engine.action(room.code, id, { type: "prepared" });
    expect(room.phase).toBe("presenting"); const index = room.round!.presentationIndex;
    expect(engine.snapshot(room, host).manualAdvanceRequired).toBe(true);
    clock(room.config.presentationSeconds * 1000 + 90_000);
    expect(room.phase).toBe("presenting"); expect(room.round!.presentationIndex).toBe(index);
    expect(engine.snapshot(room, host).awaitingHost).toBe(true);
    expect(() => engine.advance(room.code, ids[1]!)).toThrow("réservée");
    engine.advance(room.code, host); expect(room.round!.presentationIndex).toBe(index + 1);
  });

  it("retire les vendeurs passés des cibles d'évaluation sans demander d'auto-évaluation", async () => {
    const { engine, room, host, ids, until } = await setup([{ gameId: "pitch", rounds: 1 }], 5);
    engine.start(room.code, host); until("voting"); engine.skipPlayer(room.code, host, ids[4]!);
    expect(engine.snapshot(room, host).progress[0]).toMatchObject({ kind: "ratings", total: 4, completed: 0 });
    for (const id of ids.slice(0, 4)) for (const target of ids.slice(0, 4).filter((target) => target !== id))
      engine.action(room.code, id, { type: "rate", targetId: target, humor: 4, conviction: 5, creativity: 4 });
    expect(room.phase).toBe("results");
    expect(room.players.slice(0, 4).every((p) => p.score > 0)).toBe(true);
  });

  it("compte uniquement les jurés pour le verdict et sépare les bonus des autres", async () => {
    const { engine, room, host, ids, until } = await setup([{ gameId: "court", rounds: 1 }]);
    engine.start(room.code, host); until("voting");
    const jurors = room.round!.roles!.jurors, others = ids.filter((id) => !jurors.includes(id));
    expect(jurors).toHaveLength(3);
    expect(engine.snapshot(room, host).progress).toEqual([
      { kind: "verdicts", label: "Jurés ayant voté", completed: 0, total: 3 },
      { kind: "bonus-votes", label: "Votes meilleure intervention", completed: 0, total: 5 },
    ]);
    for (const id of jurors) engine.action(room.code, id, { type: "verdict", guilty: true });
    expect(room.phase).toBe("voting");
    expect(engine.snapshot(room, host).progress[0]).toMatchObject({ completed: 3, total: 3 });
    for (const id of others) engine.action(room.code, id, { type: "vote", targetId: ids.find((target) => target !== id)! });
    expect(room.phase).toBe("results"); expect(room.round!.verdict).toBe("guilty");
  });

  it("limite le spam et la durée des réactions et copie les snapshots sans mutation partagée", async () => {
    const { engine, room, host, ids, clock } = await setup();
    expect(() => engine.react(room.code, host, "<script>")).toThrow("inconnue");
    engine.react(room.code, host, "😂"); expect(() => engine.react(room.code, host, "👏")).toThrow("secondes");
    const snapshot = engine.snapshot(room, ids[1]!);
    expect(snapshot.reactions).toHaveLength(1); snapshot.reactions[0]!.reaction = "injected";
    snapshot.config.noPoints = true;
    snapshot.players[0]!.history.push({ gameId: "mythos", points: 999, reason: "injected" });
    expect(engine.snapshot(room, host).reactions[0]?.reaction).toBe("😂");
    expect(room.config.noPoints).toBe(false); expect(room.players[0]!.history).toEqual([]);
    clock(2000); engine.react(room.code, host, "👏"); clock(6000); expect(engine.snapshot(room, host).reactions).toEqual([]);
    engine.configure(room.code, host, { ...room.config, reactionsEnabled: false });
    expect(() => engine.react(room.code, host, "❤️")).toThrow("désactivées");
  });

  it("récompense une mission privée vérifiable uniquement si le mot imposé est présent", async () => {
    const { engine, room, host, ids, until } = await setup();
    engine.configure(room.code, host, { ...room.config, secretRoles: true });
    const scene = engine.join(room.code, "Scène TV", AVATARS[11]!, true);
    engine.start(room.code, host); until("writing"); const mission = engine.snapshot(room, host).me.secretMission!;
    expect(mission.word).toBeTruthy(); expect(engine.snapshot(room, scene.session.playerId).me.secretMission).toBeUndefined();
    expect(JSON.stringify(engine.snapshot(room, scene.session.playerId))).not.toContain(mission.word);
    answer(engine, room, host, `Ce ${mission.word} explique tout.`);
    for (const id of ids.slice(1)) answer(engine, room, id);
    until("voting");
    for (const id of ids) engine.action(room.code, id, { type: "vote", targetId: room.round!.answers.find((a) => a.authorId !== id)!.id });
    expect(room.round!.results.filter((r) => r.reason.startsWith("Mission secrète"))).toEqual([
      { playerId: host, points: 50, reason: "Mission secrète : mot imposé placé" },
    ]);
  });

  it("exclut l'hôte animateur du minimum de trois participants", async () => {
    const engine = new GameEngine({ store: new MemoryStore() }); await engine.initialize();
    const { room, session } = engine.create("Animateur", AVATARS[0]!, false);
    engine.configure(room.code, session.playerId, { ...structuredClone(DEFAULT_CONFIG), playlist: [{ gameId: "mythos", rounds: 1 }] });
    expect(engine.getPlayer(room, session.playerId).spectator).toBe(true);
    for (let i = 0; i < 2; i++) {
      const joined = engine.join(room.code, `Ami ${i}`, AVATARS[i]!); engine.ready(room.code, joined.session.playerId, true);
    }
    expect(() => engine.start(room.code, session.playerId)).toThrow("3 joueurs");
    const third = engine.join(room.code, "Dernier ami", AVATARS[3]!); engine.ready(room.code, third.session.playerId, true);
    engine.start(room.code, session.playerId); expect(room.round!.participantIds).toHaveLength(3);
    expect(room.round!.participantIds).not.toContain(session.playerId);
  });

  it("décale le début de phase à la reprise pour préserver la position des animations", async () => {
    const { engine, room, host, clock } = await setup();
    engine.start(room.code, host); const startedAt = room.phaseStartedAt;
    clock(2000); engine.pause(room.code, host, true); clock(30_000); engine.pause(room.code, host, false);
    expect(room.phaseStartedAt).toBe(startedAt + 30_000);
    expect(room.deadline! - room.phaseStartedAt).toBe(6000);
    clock(3999); expect(room.phase).toBe("party-intro"); clock(1); expect(room.phase).toBe("intro");
  });

  it("migre une sauvegarde antérieure sans nouveaux réglages ni métadonnées", async () => {
    const { engine, store, room, host, sessions, until } = await setup();
    engine.start(room.code, host); until("writing"); answer(engine, room, host, "Persistant privé"); await engine.flush();
    const legacy = structuredClone(room) as unknown as Record<string, any>;
    delete legacy.phaseStartedAt; delete legacy.phaseExcludedIds; delete legacy.reactions; delete legacy.lastReactionAt;
    delete legacy.config.noPoints; delete legacy.config.reactionsEnabled; delete legacy.config.secretRoles; delete legacy.config.autoAdvance;
    delete legacy.round.prepared; delete legacy.round.missions;
    await store.saveRoom(legacy as Room);
    const restored = new GameEngine({ store, now: () => 1_000_100 }); await restored.initialize();
    const saved = restored.getRoom(room.code); expect(saved.paused).toBe(true); expect(saved.phaseStartedAt).toBe(room.updatedAt);
    expect(saved.config.noPoints).toBe(false); expect(saved.config.reactionsEnabled).toBe(true);
    expect(saved.players.every((p) => !p.connected)).toBe(true); restored.resume(sessions[0]!);
    expect(restored.snapshot(saved, host).me.answer).toBe("Persistant privé");
    expect(restored.snapshot(saved, sessions[1]!.playerId).me.answer).toBeUndefined();
  });

  it.each([false, true])("joue toute la playlist et le podium avec noPoints=%s", async (noPoints) => {
    const playlist: PlaylistItem[] = [
      { gameId: "mythos", rounds: 2 }, { gameId: "pitch", rounds: 1, pitchMode: "random" },
      { gameId: "pitch", rounds: 1, pitchMode: "invented" }, { gameId: "court", rounds: 1 },
      { gameId: "who", rounds: 1 }, { gameId: "captions", rounds: 1 },
    ];
    const { engine, room, host, sessions, ids, clock } = await setup(playlist);
    engine.configure(room.code, host, { ...room.config, autoAdvance: false, noPoints }); engine.start(room.code, host);
    clock(120_000); expect(room.phase).toBe("party-intro");
    const seen = new Set<string>(); let safety = 0, reconnected = false;
    while (room.phase !== "podium" && safety++ < 160) {
      const round = room.round!;
      if (room.phase === "writing") {
        if (!reconnected) { engine.disconnect(room.code, ids[7]!); clock(1000); engine.resume(sessions[7]!); reconnected = true; }
        for (const id of round.participantIds) engine.action(room.code, id, round.gameId === "pitch"
          ? { type: "product", name: `Objet ${id}`, description: "Une invention douteuse." }
          : { type: "answer", text: `Réponse de ${id}` });
      } else if (room.phase === "prepare") {
        for (const id of round.participantIds) engine.action(room.code, id, { type: "prepared" });
      } else if (room.phase === "voting") {
        seen.add(round.gameId);
        for (const id of round.participantIds) {
          if (round.gameId === "pitch") for (const p of round.products.filter((p) => p.sellerId !== id))
            engine.action(room.code, id, { type: "rate", targetId: p.sellerId!, humor: 4, conviction: 5, creativity: 4 });
          else if (round.gameId === "court") engine.action(room.code, id, round.roles!.jurors.includes(id)
            ? { type: "verdict", guilty: true, bestPlayerId: round.participantIds.find((p) => p !== id) }
            : { type: "vote", targetId: round.participantIds.find((p) => p !== id)! });
          else if (round.gameId === "who") engine.action(room.code, id, { type: "vote", targetId: round.participantIds.find((p) => p !== id)! });
          else engine.action(room.code, id, { type: "vote", targetId: round.answers.find((a) => a.authorId !== id)!.id });
        }
        expect(room.phase).toBe("results");
      } else engine.advance(room.code, host);
    }
    expect(safety).toBeLessThan(160); expect([...seen].sort()).toEqual(["captions", "court", "mythos", "pitch", "who"]);
    expect(room.players.some((p) => p.score > 0)).toBe(!noPoints);
    if (noPoints) expect(engine.snapshot(room, host).players.every((p) => !p.bestGame && p.gameWins === 0)).toBe(true);
    engine.replay(room.code, host); expect(room.phase).toBe("lobby");
    expect(room.players.every((p) => p.score === 0 && p.history.length === 0)).toBe(true); await engine.flush();
  });
});
