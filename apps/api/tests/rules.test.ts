import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "@en-vrille/shared";
import {
  buildPlaylist,
  derangement,
  whoScores,
  writingScores,
} from "../src/rules.js";

describe("règles de score et votes", () => {
  it("attribue 100 par vote et 150 à tous les gagnants ex æquo", () => {
    const results = writingScores(
      [
        { id: "a", authorId: "alice" },
        { id: "b", authorId: "bob" },
        { id: "c", authorId: "charlie" },
      ],
      { alice: "b", bob: "a", charlie: "a", diane: "b" },
    );
    expect(results.map((r) => r.points)).toEqual([350, 350, 0]);
    expect(writingScores([{ id: "a", authorId: "alice" }], {})[0]?.points).toBe(
      0,
    );
  });
  it("Qui parmi nous récompense la prédiction et la personne désignée, avec égalités", () => {
    const result = whoScores({ a: "c", b: "c", c: "b", d: "b" });
    expect(result.winners.sort()).toEqual(["b", "c"]);
    expect(
      Object.fromEntries(result.results.map((r) => [r.playerId, r.points])),
    ).toEqual({ a: 100, b: 150, c: 150, d: 100 });
    expect(
      whoScores({ a: "b" }, true).results.every((r) => r.points === 0),
    ).toBe(true);
  });
  it("distribue exactement une invention étrangère par joueur, de 3 à 12 joueurs", () => {
    for (let size = 3; size <= 12; size++)
      for (let run = 0; run < 40; run++) {
        const originals = Array.from({ length: size }, (_, i) => i),
          distributed = derangement(originals);
        expect([...distributed].sort((a, b) => a - b)).toEqual(originals);
        expect(distributed.every((value, index) => value !== index)).toBe(true);
      }
    expect(() => derangement([1])).toThrow();
  });
  it("génère des playlists sans répétition ni jeux interdits", () => {
    const config = {
      ...structuredClone(DEFAULT_CONFIG),
      mode: "random" as const,
      allowedGames: ["mythos", "who", "captions"] as const,
      randomCount: 3,
    };
    const result = buildPlaylist({
      ...config,
      allowedGames: [...config.allowedGames],
    });
    expect(new Set(result.map((r) => r.gameId)).size).toBe(3);
    expect(() =>
      buildPlaylist({
        ...config,
        allowedGames: [...config.allowedGames],
        randomCount: 4,
      }),
    ).toThrow();
    const repeats = buildPlaylist({
      ...config,
      allowedGames: [...config.allowedGames],
      randomCount: 9,
      allowRepeats: true,
    });
    expect(
      repeats.every((r, i) => i === 0 || r.gameId !== repeats[i - 1]?.gameId),
    ).toBe(true);
  });
});
