import { randomInt } from "node:crypto";
import { z } from "zod";
import { GAME_IDS } from "@en-vrille/shared";
import type { GameId, PlaylistItem, RoomConfig } from "@en-vrille/shared";

export const gameSchema = z.enum(GAME_IDS);
export const configSchema = z
  .object({
    mode: z.enum(["custom", "random"]),
    playlist: z
      .array(
        z.object({
          gameId: gameSchema,
          rounds: z.number().int().min(1).max(10),
          pitchMode: z.enum(["random", "invented"]).optional(),
        }),
      )
      .min(1)
      .max(12),
    randomCount: z.number().int().min(1).max(12),
    randomRounds: z.number().int().min(0).max(5),
    allowedGames: z.array(gameSchema).min(1).max(5),
    allowRepeats: z.boolean(),
    approximateMinutes: z.number().min(5).max(180),
    answerSeconds: z.number().int().min(0).max(600),
    voteSeconds: z.number().int().min(0).max(300),
    presentationSeconds: z.number().int().min(0).max(600),
    transitionSeconds: z.number().int().min(3).max(60),
    anonymousVotes: z.boolean(),
    allowVoteChange: z.boolean(),
    allowSelfVoteWho: z.boolean(),
    whoNoPoints: z.boolean(),
    noPoints: z.boolean().default(false),
    reactionsEnabled: z.boolean().default(true),
    secretRoles: z.boolean().default(false),
    autoAdvance: z.boolean().default(false),
    language: z.enum(["fr", "en"]).default("fr"),
    captionLength: z.enum(["short", "normal", "long"]).default("long"),
    captionAutoSlides: z.boolean().default(false),
    captionSlideSeconds: z.number().int().min(3).max(30).default(7),
    leaderboard: z.enum(["round", "game", "final"]),
    adult: z.boolean(),
    disabledCategories: z.array(z.string().max(60)).max(50),
    balanced: z.boolean(),
    coefficients: z.object({
      mythos: z.number().min(0).max(3),
      pitch: z.number().min(0).max(3),
      court: z.number().min(0).max(3),
      who: z.number().min(0).max(3),
      captions: z.number().min(0).max(3),
    }),
    connectionMode: z.enum(["local", "online", "hybrid"]),
  })
  .strict()
  .refine(
    (c) => c.playlist.reduce((n, g) => n + g.rounds, 0) <= 40,
    "Une soirée contient au maximum 40 manches.",
  );

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("prepared") }).strict(),
  z
    .object({
      type: z.literal("answer"),
      text: z.string().trim().min(1).max(350),
    })
    .strict(),
  z
    .object({
      type: z.literal("product"),
      name: z.string().trim().min(1).max(70),
      description: z.string().trim().min(1).max(220),
      suggestionToken: z.string().uuid().optional(),
    })
    .strict(),
  z.object({ type: z.literal("caption"), text: z.string().trim().min(1).max(220) }).strict(),
  z.object({ type: z.literal("cinema-vote"), award: z.enum(["film", "actor", "line"]), targetId: z.string().min(1).max(100) }).strict(),
  z
    .object({ type: z.literal("vote"), targetId: z.string().min(1).max(100) })
    .strict(),
  z
    .object({
      type: z.literal("rate"),
      targetId: z.string().min(1).max(100),
      humor: z.number().int().min(1).max(5),
      conviction: z.number().int().min(1).max(5),
      creativity: z.number().int().min(1).max(5),
    })
    .strict(),
  z
    .object({
      type: z.literal("verdict"),
      guilty: z.boolean(),
      bestPlayerId: z.string().max(100).optional(),
    })
    .strict(),
]);
/** Plain text is rendered by React; control characters are removed without destroying legitimate punctuation. */
export function cleanText(value: string) {
  return value
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}
export function shuffled<T>(
  values: readonly T[],
  rng: (max: number) => number = randomInt,
): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
/** Sattolo's cycle: uniform cycle, one product per seller and no fixed points. */
export function derangement<T>(
  values: readonly T[],
  rng: (max: number) => number = randomInt,
): T[] {
  if (values.length < 2) throw new Error("Il faut au moins deux objets.");
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng(i);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
export function topTargets(votes: Record<string, string>) {
  const counts: Record<string, number> = {};
  for (const target of Object.values(votes))
    counts[target] = (counts[target] || 0) + 1;
  const max = Math.max(0, ...Object.values(counts));
  return {
    counts,
    winners: Object.keys(counts).filter((id) => counts[id] === max),
  };
}
export function writingScores(
  answers: { id: string; authorId: string }[],
  votes: Record<string, string>,
) {
  const { counts, winners } = topTargets(votes);
  return answers.map((a) => ({
    playerId: a.authorId,
    points: (counts[a.id] || 0) * 100 + (winners.includes(a.id) ? 150 : 0),
    reason: "Votes reçus et bonus du public",
    votes: counts[a.id] || 0,
  }));
}
export function whoScores(votes: Record<string, string>, noPoints = false) {
  const { counts, winners } = topTargets(votes);
  return {
    counts,
    winners,
    results: Object.entries(votes).map(([playerId, target]) => ({
      playerId,
      points: noPoints ? 0 : winners.includes(target) ? 100 : 0,
      reason: noPoints ? "Ambiance sans points" : winners.includes(target)
        ? "+100 : votre choix figure en tête du vote, égalités incluses"
        : "+0 : votre choix n’est pas arrivé en tête du vote",
    })),
  };
}
/** A fixed party budget per game, independent of the number of questions or voters. */
export function normalizationFactors(playlist: readonly PlaylistItem[], playerCount: number, secretRoles = false): Partial<Record<GameId, number>> {
  const rounds: Partial<Record<GameId, number>> = {}, ceilings: Partial<Record<GameId, number>> = {};
  for (const item of playlist) {
    const maximum: Record<GameId, number> = {
      mythos: 100 * Math.max(0, playerCount - 1) + 150,
      who: 100,
      pitch: item.pitchMode === "invented" ? 600 : 500,
      court: 450,
      captions: 550,
    };
    const mission = secretRoles && (item.gameId === "mythos" || item.gameId === "pitch" && item.pitchMode === "invented") ? 50 : 0;
    rounds[item.gameId] = (rounds[item.gameId] || 0) + item.rounds;
    ceilings[item.gameId] = Math.max(ceilings[item.gameId] || 0, maximum[item.gameId] + mission);
  }
  return Object.fromEntries(Object.entries(rounds).map(([id, count]) => [id, 1000 / ((ceilings[id as GameId] || 1) * count!)]));
}
export function normalizePartyPoints(points: number, factor: number) {
  return Math.round(points * factor);
}
export function buildPlaylist(
  config: RoomConfig,
  rng: (max: number) => number = randomInt,
): PlaylistItem[] {
  if (config.mode === "custom") return structuredClone(config.playlist);
  const allowed = [...new Set(config.allowedGames)];
  if (!config.allowRepeats && config.randomCount > allowed.length)
    throw new Error(
      "Autorisez les répétitions ou sélectionnez davantage de jeux.",
    );
  const result: PlaylistItem[] = [];
  let bag: GameId[] = [];
  // Duration informs the automatic round count; explicit rounds always take precedence.
  const estimates: Record<GameId, number> = {
    mythos: 3,
    pitch: 8,
    court: 7,
    who: 1,
    captions: 3,
  };
  for (let i = 0; i < config.randomCount; i++) {
    if (!bag.length) bag = shuffled(allowed, rng);
    if (
      result.length &&
      bag.length > 1 &&
      bag[bag.length - 1] === result[result.length - 1]?.gameId
    )
      [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1]!, bag[0]!];
    const gameId = bag.pop()!;
    const budget = Math.max(
      1,
      Math.min(
        5,
        Math.round(
          config.approximateMinutes / config.randomCount / estimates[gameId],
        ),
      ),
    );
    result.push({
      gameId,
      rounds: config.randomRounds || 1 + rng(budget),
      ...(gameId === "pitch"
        ? { pitchMode: rng(2) ? "invented" : "random" }
        : {}),
    });
  }
  if (result.reduce((n, g) => n + g.rounds, 0) > 40)
    throw new Error("Réduisez le nombre de jeux ou de manches (40 maximum).");
  return result;
}
