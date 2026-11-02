import assert from "node:assert/strict";
import { test } from "node:test";
import { denied, ok, party } from "./helpers/party.ts";

for (const count of [3, 4, 5, 8]) {
  test(`Inventions à ${count} : objets exacts, aide modifiable et permutation sans auto-attribution`, async t => {
    const f = await party(t, "pitch", count);
    await f.start();
    const originals = new Map<string, string>();
    for (const [index, player] of f.players.entries()) {
      let name = `Objet humain exact ${index}`, description = `Description originale ${index} : éèà !`;
      let suggestionToken: string | undefined;
      if (index >= count - 2) {
        const ack = await ok(player, "room:product-suggestion");
        assert.equal(ack.room?.me.submitted, false, "House Decoy never automatically submits");
        const suggestion = ack.room?.me.productSuggestion;
        assert.ok(suggestion);
        name = `${suggestion.name.slice(0, 45)} modifié ${index}`;
        description = `${suggestion.description.slice(0, 180)} — réécrit`;
        suggestionToken = suggestion.token;
      }
      originals.set(player.session!.clientId, name);
      await ok(player, "room:action", { type: "product", name, description, ...(suggestionToken ? { suggestionToken } : {}) });
      assert.equal(f.view(player).me.product?.name, name);
      assert.equal(f.view(player).me.product?.description, description);
    }
    assert.equal(f.view(f.host).phase, "writing");
    assert.equal(f.view(f.host).progress[0]?.completed, count);
    f.jump(3_600_000);
    assert.equal(f.view(f.display).phase, "writing", "no unlimited timer secretly advances");
    await f.advance();
    assert.equal(f.view(f.host).phase, "prepare");
    const assigned = new Set<string>();
    for (const player of f.players) {
      const product = f.view(player).me.product;
      assert.ok(product);
      assert.ok([...originals.values()].includes(product.name), "human inventions are never replaced by server suggestions");
      assert.notEqual(product.name, originals.get(player.session!.clientId));
      assert.equal(product.generated, undefined, "House Decoy origin remains secret");
      assert.equal(product.creatorId, undefined);
      assigned.add(product.name);
    }
    assert.equal(assigned.size, count, "each invention is distributed once");
  });
}

test("Téléachat : roue autoritaire, présentation libre et rideaux pour chaque vendeur, dernier compris", async t => {
  const f = await party(t, "pitch", 3);
  await f.start();
  for (const [index, player] of f.players.entries())
    await ok(player, "room:action", { type: "product", name: `Produit ${index}`, description: `Promesse ${index}` });
  await f.advance();
  for (const player of f.players) await ok(player, "room:action", { type: "prepared" });
  assert.equal(f.view(f.host).phase, "prepare");
  await f.advance();
  const revealed = new Set<string>();
  for (let sellerIndex = 0; sellerIndex < 3; sellerIndex++) {
    assert.equal(f.view(f.host).round?.pitchStage, "wheel");
    const stale = f.view(f.host).transitionId;
    await f.advance();
    await denied(f.host, "room:advance", { transitionId: stale });
    assert.equal(f.view(f.display).round?.pitchStage, "selected");
    const seller = f.view(f.display).round?.currentSpeakerId;
    assert.ok(seller);
    assert.equal(f.view(f.players[1]!).round?.currentSpeakerId, seller);
    await f.advance();
    assert.equal(f.view(f.host).round?.pitchStage, "speaking");
    const speaking = f.view(f.host).transitionId;
    f.jump(600_000);
    assert.equal(f.view(f.host).transitionId, speaking, "oral contribution is never interrupted");
    await f.advance();
    assert.equal(f.view(f.host).phase, "voting");
    assert.equal(f.view(f.host).progress[0]?.total, 2);
    for (const player of f.players) {
      const event = { type: "rate", targetId: seller, humor: 5, conviction: 4, creativity: 3 };
      if (player.session!.clientId === seller) await denied(player, "room:action", event);
      else await ok(player, "room:action", event);
    }
    assert.equal(f.view(f.display).phase, "voting");
    assert.equal(f.view(f.display).round?.pitchRating, undefined, "curtains hide ratings until the command");
    await f.advance();
    const results = f.view(f.display);
    assert.equal(results.phase, "results");
    assert.equal(results.round?.pitchRating?.sellerId, seller);
    assert.equal(results.round?.pitchRating?.ratingsCount, 2);
    assert.equal(results.round?.pitchRating?.average, 4);
    assert.equal(results.round?.pitchRating?.humor, 5);
    assert.equal(results.round?.pitchRating?.conviction, 4);
    assert.equal(results.round?.pitchRating?.creativity, 3);
    revealed.add(seller);
    f.jump(600_000);
    assert.equal(f.view(f.display).transitionId, results.transitionId, "ratings remain visible until another click");
    await f.advance();
  }
  assert.equal(revealed.size, 3, "last seller also gets a full rating reveal");
  assert.equal(f.view(f.host).phase, "results");
  assert.equal(f.view(f.host).round?.pitchFinalResults, true);
  assert.equal(f.view(f.host).round?.products?.length, 3);
  assert.ok(f.view(f.host).round?.products?.every(p => !!p.creatorId));
});

test("Qui parmi nous : +100 pour prédire une majorité ex æquo, aucun point au désigné", async t => {
  const f = await party(t, "who", 5, { allowSelfVoteWho: true });
  await f.start();
  assert.equal(f.view(f.host).phase, "voting");
  const ids = f.players.map(p => p.session!.clientId);
  const targets = [ids[0], ids[0], ids[1], ids[1], ids[2]];
  for (const [index, player] of f.players.entries())
    await ok(player, "room:action", { type: "vote", targetId: targets[index] });
  assert.equal(f.view(f.host).phase, "voting");
  await f.advance();
  const results = f.view(f.display).round!.results;
  for (let index = 0; index < ids.length; index++) {
    const earned = results.filter(r => r.playerId === ids[index]).reduce((sum, r) => sum + r.points, 0);
    assert.equal(earned, index < 4 ? 100 : 0);
  }
  assert.equal(results.reduce((sum, r) => sum + r.points, 0), 400, "no extra reward for the named player");
  assert.equal(f.view(f.display).round?.votesByPlayer, undefined);
  const current = f.view(f.display).transitionId;
  f.jump(600_000);
  assert.equal(f.view(f.display).transitionId, current, "discussion time is controlled manually");
});

test("Qui parmi nous : variante ambiance sans points", async t => {
  const f = await party(t, "who", 3, { whoNoPoints: true });
  await f.start();
  for (const [index, player] of f.players.entries())
    await ok(player, "room:action", { type: "vote", targetId: f.players[(index + 1) % 3]!.session!.clientId });
  await f.advance();
  assert.ok(f.view(f.display).round?.results.every(r => r.points === 0));
  assert.ok(f.server.engine.getRoom(f.code).players.every(p => p.score === 0));
});

for (const rounds of [1, 4]) {
  test(`Équilibrage : ${rounds} manche(s) de majorité gardent +100 au jeu et le même budget soirée`, async t => {
    const f = await party(t, "who", 3, { balanced: true, allowSelfVoteWho: true,
      playlist: [{ gameId: "who", rounds }] });
    await f.start();
    let completedRounds = 0;
    for (let guard = 0; f.view(f.host).phase !== "podium"; guard++) {
      assert.ok(guard < 40);
      const current = f.view(f.host);
      if (current.phase === "voting") {
        for (const player of f.players) await ok(player, "room:action", { type: "vote", targetId: f.host.session!.clientId });
      }
      if (current.phase === "results") {
        completedRounds++;
        for (const result of current.round!.results) {
          assert.equal(result.points, 100, "the advertised majority reward never changes");
          assert.equal(result.partyPoints, 1000 / rounds);
        }
      }
      await f.advance();
    }
    assert.equal(completedRounds, rounds);
    assert.ok(f.view(f.display).players.every(player => player.score === 1000), "more rounds cannot mechanically dominate the party");
    assert.ok(f.view(f.display).players.every(player => player.history.every(entry => entry.gamePoints === 100)));
  });
}

test("Tribunal : rôles adaptés, interventions manuelles, verdict réservé aux jurés et compteurs exacts", async t => {
  const f = await party(t, "court", 5);
  await f.start();
  const roles = f.view(f.host).round!.roles!;
  assert.equal(new Set([roles.accused, roles.prosecutor, roles.defense, roles.judge, ...roles.jurors, ...roles.witnesses]).size, 5);
  assert.equal(roles.jurors.length, 1);
  for (const player of f.players) await ok(player, "room:action", { type: "prepared" });
  await f.advance();
  for (const step of ["accusation", "defense", "questions", "final"]) {
    assert.equal(f.view(f.display).phase, "presenting");
    assert.equal(f.view(f.display).round?.courtStep, step);
    const current = f.view(f.host).transitionId;
    f.jump(300_000);
    assert.equal(f.view(f.host).transitionId, current);
    await f.advance();
  }
  assert.equal(f.view(f.host).phase, "voting");
  const jury = f.players.find(p => roles.jurors.includes(p.session!.clientId))!;
  const nonJury = f.players.find(p => !roles.jurors.includes(p.session!.clientId))!;
  await denied(nonJury, "room:action", { type: "verdict", guilty: true });
  assert.equal(f.view(f.display).progress.find(p => p.kind === "verdicts")?.total, 1);
  await ok(jury, "room:action", { type: "verdict", guilty: true });
  for (const player of f.players.filter(p => p !== jury)) {
    const target = f.players.find(p => p !== player)!;
    await ok(player, "room:action", { type: "vote", targetId: target.session!.clientId });
  }
  assert.equal(f.view(f.display).progress.find(p => p.kind === "verdicts")?.completed, 1);
  assert.equal(f.view(f.display).round?.verdict, undefined);
  await f.advance();
  assert.equal(f.view(f.display).round?.verdict, "guilty");
  const verdict = f.view(f.display).transitionId;
  f.jump(300_000);
  assert.equal(f.view(f.display).transitionId, verdict);
});

test("Cinéma : rotation privée complète, vidéo et timecodes, commandes de lecture mobiles protégées", async t => {
  const f = await party(t, "captions", 5, { captionLength: "long" });
  await f.start();
  const assignments = new Map<string, Set<string>>();
  for (let turn = 0; turn < 5; turn++) {
    assert.equal(f.view(f.display).phase, "writing");
    assert.equal(f.view(f.display).captions?.writingTurn, turn + 1);
    assert.equal(f.view(f.display).captions?.currentStory, undefined);
    assert.equal(f.view(f.display).captions?.stories, undefined);
    assert.equal(f.view(f.display).me.captions?.frame, undefined);
    for (const [index, player] of f.players.entries()) {
      const privateScene = f.view(player).me.captions!;
      assert.ok(privateScene.frame?.url);
      assert.ok(privateScene.storyId);
      const seen = assignments.get(player.session!.clientId) || new Set<string>();
      assert.ok(!seen.has(privateScene.storyId), "each player contributes once to each scene");
      seen.add(privateScene.storyId);
      assignments.set(player.session!.clientId, seen);
      assert.equal(privateScene.previousLines.length, turn);
      await ok(player, "room:action", { type: "caption", text: `Réplique ${turn + 1} du joueur ${index + 1}` });
    }
    assert.equal(f.view(f.display).phase, "writing");
    await f.advance();
  }
  assert.equal(f.view(f.display).phase, "reveal");
  await f.advance();
  assert.equal(f.view(f.host).phase, "prepare");
  for (const player of f.players) await ok(player, "room:action", { type: "prepared" });
  await f.advance();
  const current = f.view(f.display), story = current.captions?.currentStory;
  assert.ok(story);
  assert.ok(story.scene.clipUrl.endsWith(".mp4"));
  assert.equal(story.lines.length, 5);
  assert.equal(story.scene.frames.length, 5);
  assert.ok(story.scene.frames.every(frame => typeof frame.timecodeMs === "number"));
  assert.equal(current.captions?.playback.mode, "video");
  let revision = current.captions!.playback.revision;
  const outsider = f.players.find(p => p !== f.host && p.session!.clientId !== story.presenterId)!;
  await denied(outsider, "room:caption-control", { playback: "pause", revision });
  await ok(f.host, "room:caption-control", { playback: "pause", revision });
  assert.equal(f.view(f.display).captions?.playback.playing, false);
  await denied(f.host, "room:caption-control", { playback: "play", revision });
  revision = f.view(f.host).captions!.playback.revision;
  await ok(f.host, "room:caption-control", { playback: "restart", revision });
  assert.equal(f.view(f.display).captions?.playback.positionMs, 0);
  revision = f.view(f.host).captions!.playback.revision;
  await ok(f.host, "room:caption-control", { mode: "slides", revision });
  assert.equal(f.view(f.display).captions?.playback.mode, "slides");
  const sceneTransition = f.view(f.host).transitionId;
  f.jump(600_000);
  assert.equal(f.view(f.host).transitionId, sceneTransition, "video completion never ends an oral presentation");
});

test("Soirée complète : cinq mini-jeux, groupe identique, reprises contrôleur, scores cumulés et podium", async t => {
  const playlist = [
    { gameId: "mythos" as const, rounds: 1 },
    { gameId: "pitch" as const, rounds: 1, pitchMode: "invented" as const },
    { gameId: "who" as const, rounds: 1 },
    { gameId: "court" as const, rounds: 1 },
    { gameId: "captions" as const, rounds: 1 },
  ];
  const f = await party(t, "mythos", 5, { playlist, captionLength: "long" });
  await f.start();
  const games = new Set<string>(), sellerReveals = new Set<string>();
  for (let guard = 0; f.view(f.display).phase !== "podium"; guard++) {
    assert.ok(guard < 150, "full party should not deadlock");
    const room = f.view(f.host), game = room.round!.gameId;
    games.add(game);
    assert.equal(room.players.length, 5);
    if (room.phase === "writing") {
      for (const [index, player] of f.players.entries()) {
        if (f.view(player).me.submitted) continue;
        if (game === "pitch") await ok(player, "room:action", { type: "product", name: `Objet intégral ${index}`, description: "Conçu en soirée." });
        else if (game === "captions") await ok(player, "room:action", { type: "caption", text: `Texte ${index} tour ${room.captions!.writingTurn}` });
        else await ok(player, "room:action", { type: "answer", text: `Mytho intégral ${index}` });
      }
    } else if (room.phase === "prepare") {
      for (const player of f.players) if (!f.view(player).me.prepared)
        await ok(player, "room:action", { type: "prepared" });
    } else if (room.phase === "voting") {
      for (const player of f.players) {
        const personal = f.view(player), id = player.session!.clientId;
        if (!personal.me.eligible || personal.me.voted) continue;
        if (game === "pitch") await ok(player, "room:action", { type: "rate", targetId: personal.round!.currentSpeakerId, humor: 4, conviction: 3, creativity: 5 });
        else if (game === "captions") {
          for (const award of ["film", "actor", "line"] as const) {
            const targetId = personal.me.captions!.eligibleTargets[award][0];
            if (targetId) await ok(player, "room:action", { type: "cinema-vote", award, targetId });
          }
        } else if (game === "court" && room.round!.roles!.jurors.includes(id))
          await ok(player, "room:action", { type: "verdict", guilty: true });
        else {
          const targetId = game === "mythos" ? personal.round!.answers.find(a => a.id !== personal.me.answerId)!.id : f.players.find(p => p !== player)!.session!.clientId;
          await ok(player, "room:action", { type: "vote", targetId });
        }
      }
    } else if (room.phase === "results" && game === "pitch" && room.round?.pitchRating)
      sellerReveals.add(room.round.pitchRating.sellerId);
    if (room.phase === "transition") {
      const replacement = await f.connect();
      await ok(replacement, "room:resume", f.host.session);
      f.host.socket = replacement.socket;
      f.host.last = replacement.last;
    }
    await f.advance();
  }
  assert.deepEqual([...games].sort(), ["captions", "court", "mythos", "pitch", "who"]);
  assert.equal(sellerReveals.size, 5);
  const final = f.view(f.display);
  assert.equal(final.players.length, 5);
  assert.equal(final.hostId, f.host.session!.clientId);
  for (const player of final.players)
    assert.equal(player.score, player.history.reduce((sum, entry) => sum + entry.points, 0));
  assert.ok(final.players.some(player => player.score > 0));
});
