import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_CONFIG } from "../packages/shared/src/index.ts";
import { createGameServer } from "../apps/api/src/server.ts";
import { denied, fixture, ok, party } from "./helpers/party.ts";

test("PC seul : salon vide, QR public sans secret et association explicite d'un téléphone", async t => {
  const f = await fixture(t), display = await f.create(), screen = f.view(display);
  assert.equal(display.session?.clientKind, "DISPLAY_CLIENT");
  assert.equal(screen.me.clientKind, "DISPLAY_CLIENT");
  assert.equal(screen.players.length, 0);
  assert.deepEqual(screen.progress.map(p => [p.completed, p.total]), [[0, 0]]);
  assert.equal(screen.hostId, "");
  assert.ok(screen.pairingCode);
  assert.ok(!screen.inviteUrl.includes(screen.pairingCode));
  const players = [];
  for (let index = 0; index < 5; index++) players.push(await f.join(screen.code, index));
  assert.equal(f.view(display).players.length, 5);
  assert.equal(f.view(players[0]!).hostId, "", "first joiner is not automatically the controller");
  for (const player of players) {
    assert.equal(player.session?.clientKind, "PLAYER_CLIENT");
    assert.equal(f.view(player).pairingCode, undefined, "public join cannot retrieve private pairing code");
  }
  await denied(display, "room:ready", { ready: true });
  await denied(display, "room:configure", DEFAULT_CONFIG);
  await denied(players[0]!, "room:claim-control", { pairingCode: "WRONG-CODE" });
  await ok(players[2]!, "room:claim-control", { pairingCode: screen.pairingCode });
  assert.equal(f.view(display).hostId, players[2]!.session!.clientId);
  assert.equal(f.view(display).pairingCode, undefined, "pairing code is consumed");
  await denied(players[0]!, "room:claim-control", { pairingCode: screen.pairingCode });
  await denied(display, "room:start");
  await denied(display, "room:action", { type: "answer", text: "Le PC n'est pas un joueur" });
});

test("Mythos : cinq réponses, cinq révélations manuelles anonymes, vote protégé et résultats persistants", async t => {
  const f = await party(t);
  await f.start();
  assert.equal(f.view(f.display).phase, "writing");
  assert.equal(f.view(f.host).advanceCommand?.enabled, false, "controller must answer before revealing");
  await denied(f.host, "room:advance", { transitionId: f.view(f.host).transitionId });
  for (const [index, player] of f.players.entries()) {
    const ack = await ok(player, "room:action", { type: "answer", text: `Réponse secrète ${index + 1}` });
    assert.equal(ack.room?.me.submitted, true);
    assert.equal(ack.room?.me.answer, `Réponse secrète ${index + 1}`);
    assert.equal(ack.room?.progress[0]?.completed, index + 1);
    assert.equal(ack.room?.progress[0]?.total, 5);
    assert.equal(ack.room?.phase, "writing");
    assert.deepEqual(f.view(f.display).round?.answers, []);
  }
  await denied(f.players[0]!, "room:action", { type: "answer", text: "Duplicata" });
  assert.equal(f.view(f.host).advanceCommand?.enabled, true);
  f.jump(600_000);
  assert.equal(f.view(f.display).phase, "writing");
  const seen = new Set<string>();
  let previousTransition = f.view(f.host).transitionId;
  for (let index = 0; index < 5; index++) {
    await f.advance();
    const snapshot = f.view(f.display);
    assert.equal(snapshot.phase, "reveal");
    assert.equal(snapshot.round?.answers.length, 1, "only the current answer is sent to the TV");
    const answer = snapshot.round!.answers[0]!;
    assert.equal(answer.authorId, undefined);
    assert.equal(answer.votes, undefined);
    assert.ok(!seen.has(answer.id));
    seen.add(answer.id);
    await denied(f.host, "room:advance", { transitionId: previousTransition });
    const stable = f.view(f.display);
    f.jump(600_000);
    assert.equal(f.view(f.display).transitionId, stable.transitionId);
    previousTransition = snapshot.transitionId;
  }
  assert.equal(seen.size, 5);
  await f.advance();
  assert.equal(f.view(f.display).phase, "voting");
  for (const player of f.players) {
    const snapshot = f.view(player), own = snapshot.me.answerId;
    assert.ok(own);
    await denied(player, "room:action", { type: "vote", targetId: own });
    const target = snapshot.round!.answers.find(a => a.id !== own)!;
    await ok(player, "room:action", { type: "vote", targetId: target.id });
    await denied(player, "room:action", { type: "vote", targetId: target.id });
  }
  assert.equal(f.view(f.host).progress[0]?.completed, 5);
  assert.equal(f.view(f.host).phase, "voting");
  await f.advance();
  assert.equal(f.view(f.display).phase, "results");
  const resultTransition = f.view(f.display).transitionId;
  f.jump(600_000);
  assert.equal(f.view(f.display).transitionId, resultTransition);
  assert.equal(f.view(f.display).round?.votesByPlayer, undefined);
  for (let guard = 0; f.view(f.host).phase !== "podium"; guard++) {
    assert.ok(guard < 15, "manual results, leaderboard and podium must be reachable");
    await f.advance();
  }
  assert.equal(f.view(f.display).players.length, 5);
  assert.ok(f.view(f.display).players.some(p => p.score > 0));
  assert.equal(f.view(f.display).podiumStep, 0);
  f.jump(600_000);
  assert.equal(f.view(f.display).podiumStep, 0, "podium never reveals places on a timer");
  for (let step = 1; step <= 3; step++) {
    const stale = f.view(f.host).transitionId;
    await f.advance();
    assert.equal(f.view(f.display).podiumStep, step);
    await denied(f.host, "room:advance", { transitionId: stale });
  }
  assert.equal(f.view(f.host).advanceCommand, null);
  await denied(f.host, "room:advance", { transitionId: f.view(f.host).transitionId });
  await ok(f.host, "room:replay");
  assert.equal(f.view(f.display).phase, "lobby");
  assert.equal(f.view(f.display).players.length, 5);
});

test("Reconnexion : identité, réponse et rôle conservés, aucune exclusion après dix secondes", async t => {
  const f = await party(t, "mythos", 5, { answerSeconds: 120 });
  await f.start();
  await ok(f.host, "room:action", { type: "answer", text: "Je reviendrai avec la même réponse." });
  const session = f.host.session!, id = session.clientId, transition = f.view(f.host).transitionId;
  f.host.socket.disconnect();
  await new Promise<void>(resolve => setImmediate(resolve));
  f.jump(300_000);
  const disconnected = f.server.engine.snapshot(f.server.engine.getRoom(f.code), f.display.session!.clientId);
  assert.equal(disconnected.phase, "writing");
  assert.equal(disconnected.transitionId, transition);
  assert.equal(disconnected.progress[0]?.total, 5);
  assert.equal(disconnected.hostId, id);
  const intruder = await f.connect();
  await denied(intruder, "room:resume", { ...session, token: "x".repeat(43) });
  const returned = await f.connect();
  const ack = await ok(returned, "room:resume", session);
  assert.equal(ack.room?.me.id, id);
  assert.equal(ack.room?.me.answer, "Je reviendrai avec la même réponse.");
  assert.equal(ack.room?.me.submitted, true);
  assert.equal(ack.room?.me.eligible, true);
  assert.equal(ack.room?.players.length, 5);
  assert.equal(ack.room?.hostId, id);
  assert.equal(ack.room?.progress[0]?.total, 5);
  await denied(returned, "room:action", { type: "answer", text: "Deuxième réponse" });
  const replacement = await f.connect();
  await ok(replacement, "room:resume", session);
  assert.equal(f.view(replacement).players.length, 5);
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(returned.socket.connected, false, "only one active connection per identity");
});

test("Contrôle : transfert explicite uniquement, aucun droit pour l'ancien contrôleur", async t => {
  const f = await party(t);
  const next = f.players[1]!;
  await denied(next, "room:transfer-control", { playerId: next.session!.clientId });
  await ok(f.host, "room:transfer-control", { playerId: next.session!.clientId });
  assert.equal(f.view(f.display).hostId, next.session!.clientId);
  await denied(f.host, "room:configure", f.configuration);
  await ok(next, "room:configure", f.configuration);
  await denied(next, "room:leave");
  assert.equal(f.view(f.display).hostId, next.session!.clientId, "the controller must transfer their role explicitly before leaving");
});

test("Timer : échéance ferme la collecte et attend le contrôleur sans dévoiler les réponses", async t => {
  const f = await party(t, "mythos", 3, { answerSeconds: 15 });
  await f.start();
  await ok(f.host, "room:action", { type: "answer", text: "Réponse dans le délai" });
  f.jump(16_000);
  assert.equal(f.view(f.display).phase, "writing");
  assert.deepEqual(f.view(f.display).round?.answers, []);
  await denied(f.players[1]!, "room:action", { type: "answer", text: "Réponse tardive" });
  const phase = f.view(f.display).transitionId;
  f.jump(60_000);
  assert.equal(f.view(f.display).transitionId, phase);
  await f.advance();
  assert.equal(f.view(f.display).phase, "reveal");
});

test("Pause sans limite : reprendre ne crée pas un faux chronomètre", async t => {
  const f = await party(t);
  await f.start();
  assert.equal(f.view(f.host).deadline, null);
  await ok(f.host, "room:pause", { paused: true });
  f.jump(120_000);
  await ok(f.host, "room:pause", { paused: false });
  assert.equal(f.view(f.host).deadline, null);
  await ok(f.host, "room:action", { type: "answer", text: "Toujours sans limite" });
});

test("Nouvel appareil : code et pseudo ne suffisent pas, approbation privée et rotation du jeton", async t => {
  const f = await party(t);
  await f.start();
  const original = f.players[2]!, oldSession = original.session!;
  await ok(original, "room:action", { type: "answer", text: "Ma contribution reste à moi." });
  const recovered = await f.connect();
  const request = await ok(recovered, "room:recovery-request", { code: f.code, name: "Joueur 3" });
  assert.ok(request.recoveryRequestId);
  assert.equal(request.session, undefined, "a name never grants access to the identity");
  assert.equal(f.view(f.display).recoveryRequests, undefined, "recovery requests are not public television data");
  assert.equal(f.view(f.players[1]!).recoveryRequests, undefined);
  assert.equal(f.view(f.host).recoveryRequests?.[0]?.name, "Joueur 3");
  await denied(f.players[1]!, "room:approve-recovery", { requestId: request.recoveryRequestId });
  const received = new Promise<any>(resolve => recovered.socket.once("room:recovered", resolve));
  await ok(f.host, "room:approve-recovery", { requestId: request.recoveryRequestId });
  const resumed = await received;
  assert.equal(resumed.ok, true);
  assert.equal(resumed.session.clientId, oldSession.clientId);
  assert.notEqual(resumed.session.token, oldSession.token);
  assert.equal(resumed.room.me.answer, "Ma contribution reste à moi.");
  assert.equal(resumed.room.me.submitted, true);
  assert.equal(resumed.room.players.length, 5);
  const thief = await f.connect();
  await denied(thief, "room:resume", oldSession);
  await denied(f.host, "room:approve-recovery", { requestId: request.recoveryRequestId });
});

test("Redémarrage serveur : salon restauré en pause, réponses et droits conservés sans faux timer", async t => {
  const f = await party(t);
  await f.start();
  await ok(f.host, "room:action", { type: "answer", text: "Persistée avant redémarrage" });
  await f.server.engine.flush();
  const restarted = await createGameServer({ store: f.store, autoTick: false,
    sessionSecret: "integration-test-secret-with-at-least-32-characters", logger: () => {} });
  t.after(() => restarted.close());
  const room = restarted.engine.getRoom(f.code);
  assert.equal(room.paused, true);
  assert.equal(room.players.length, 5);
  restarted.engine.resume(f.display.session!);
  for (const player of f.players) restarted.engine.resume(player.session!);
  const snapshot = restarted.engine.snapshot(room, f.host.session!.clientId);
  assert.equal(snapshot.me.answer, "Persistée avant redémarrage");
  assert.equal(snapshot.me.submitted, true);
  assert.equal(snapshot.hostId, f.host.session!.clientId);
  restarted.engine.pause(f.code, f.host.session!.clientId, false);
  assert.equal(restarted.engine.snapshot(room, f.host.session!.clientId).deadline, null);
});

test("Création expirée : réouverture explicite sans limite conserve les inventions et évite un blocage", async t => {
  const f = await party(t, "pitch", 3, { answerSeconds: 15 });
  await f.start();
  await ok(f.host, "room:action", { type: "product", name: "La première invention", description: "Elle reste intacte." });
  f.jump(16_000);
  assert.equal(f.view(f.host).collectionClosed, true);
  await denied(f.host, "room:advance", { transitionId: f.view(f.host).transitionId });
  const transitionId = f.view(f.host).transitionId;
  await denied(f.players[1]!, "room:reopen-collection", { transitionId, seconds: 0 });
  await ok(f.host, "room:reopen-collection", { transitionId, seconds: 0 });
  await denied(f.host, "room:reopen-collection", { transitionId, seconds: 0 });
  assert.equal(f.view(f.host).deadline, null);
  assert.equal(f.view(f.host).collectionClosed, false);
  assert.equal(f.view(f.host).me.product?.name, "La première invention");
  assert.equal(f.view(f.host).me.submitted, true);
  assert.equal(f.view(f.host).progress[0]?.completed, 1);
  for (const [index, player] of f.players.slice(1).entries())
    await ok(player, "room:action", { type: "product", name: `Invention retrouvée ${index}`, description: "Aucune substitution." });
  await f.advance();
  assert.equal(f.view(f.display).phase, "prepare");
});
