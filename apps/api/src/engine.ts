import {
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { CONTENT } from "@en-vrille/content";
import type { ContentItem } from "@en-vrille/content";
import { AVATARS, COLORS, DEFAULT_CONFIG, GAMES } from "@en-vrille/shared";
import type {
  Action,
  GameId,
  Phase,
  PlayerView,
  Product,
  RoomConfig,
  RoomSnapshot,
  RoundResult,
  Session,
} from "@en-vrille/shared";
import type { Player, Room, Round } from "./model.js";
import type { Store } from "./store.js";
import {
  actionSchema,
  buildPlaylist,
  cleanText,
  configSchema,
  derangement,
  shuffled,
  topTargets,
  whoScores,
  writingScores,
} from "./rules.js";

export interface EngineOptions {
  store: Store;
  now?: () => number;
  random?: (max: number) => number;
  publicUrl?: string;
  sessionSecret?: string;
  onChange?: (room: Room) => void;
  onError?: (error: unknown) => void;
}
const STEPS = ["accusation", "defense", "questions", "final"];
const MESSAGES = [
  "La compétition monte. Le niveau, on verra.",
  "Le classement vient de changer. Certaines amitiés aussi.",
  "Le jury a décidé. Personne ne respecte sa décision.",
];
function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export class GameEngine {
  readonly rooms = new Map<string, Room>();
  content: ContentItem[] = structuredClone(CONTENT);
  onChange: (room: Room) => void;
  persistenceError: unknown;
  private writes: Promise<void> = Promise.resolve();
  private readonly now: () => number;
  private readonly random: (max: number) => number;
  private readonly publicUrl: string;
  private readonly sessionSecret: string;
  constructor(private options: EngineOptions) {
    this.now = options.now || Date.now;
    this.random = options.random || randomInt;
    this.publicUrl = (options.publicUrl || "http://localhost:5173").replace(
      /\/$/,
      "",
    );
    this.onChange = options.onChange || (() => {});
    this.sessionSecret =
      options.sessionSecret ||
      process.env.SESSION_SECRET ||
      "en-vrille-local-development-only";
  }
  private hash(token: string) {
    return createHmac("sha256", this.sessionSecret).update(token).digest("hex");
  }
  async initialize() {
    const saved = await this.options.store.load();
    if (saved.content) this.content = saved.content;
    for (const room of saved.rooms) {
      if (this.now() - room.updatedAt > 7 * 86400_000) continue;
      for (const player of room.players) player.connected = false;
      if (room.phase !== "lobby" && room.phase !== "podium") {
        room.remaining = room.paused
          ? room.remaining
          : Math.max(1000, (room.deadline || this.now() + 30_000) - this.now());
        room.paused = true;
        room.deadline = null;
        room.message = "Salon restauré. L’hôte peut reprendre la soirée.";
      }
      this.rooms.set(room.code, room);
    }
  }
  async flush() {
    await this.writes;
    if (this.persistenceError)
      throw new Error(
        "La sauvegarde est indisponible. Réessayez dans un instant.",
      );
  }
  private changed(room: Room) {
    room.updatedAt = this.now();
    const snapshot = structuredClone(room);
    this.writes = this.writes
      .catch(() => {})
      .then(() => this.options.store.saveRoom(snapshot))
      .then(() => {
        this.persistenceError = undefined;
      })
      .catch((error) => {
        this.persistenceError = error;
        this.options.onError?.(error);
      });
    this.onChange(room);
  }
  getRoom(code: string) {
    const room = this.rooms.get(code.toUpperCase());
    check(room, "Ce salon n’existe pas ou a expiré.");
    return room;
  }
  getPlayer(room: Room, id: string) {
    const player = room.players.find((p) => p.id === id);
    check(player, "Session introuvable. Rejoignez à nouveau le salon.");
    return player;
  }
  private host(room: Room, id: string) {
    check(room.hostId === id, "Cette action est réservée à l’hôte.");
  }
  private makePlayer(
    name: string,
    avatar: string,
    index: number,
  ): { player: Player; token: string } {
    name = cleanText(name);
    check(
      name.length >= 2 && name.length <= 22,
      "Le pseudo doit contenir entre 2 et 22 caractères.",
    );
    check(AVATARS.includes(avatar), "Choisissez un avatar de la liste.");
    const token = randomBytes(32).toString("base64url");
    return {
      token,
      player: {
        id: randomUUID(),
        tokenHash: this.hash(token),
        name,
        avatar,
        color: COLORS[index % COLORS.length]!,
        connected: true,
        ready: false,
        spectator: false,
        score: 0,
        delta: 0,
        previousRank: index + 1,
        roundWins: 0,
        gameWins: 0,
        history: [],
      },
    };
  }
  create(name: string, avatar: string) {
    check(
      this.rooms.size < 1000,
      "Le serveur est complet. Réessayez plus tard.",
    );
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let code = "";
    do {
      code = Array.from(
        { length: 6 },
        () => alphabet[randomInt(alphabet.length)],
      ).join("");
    } while (this.rooms.has(code));
    const { player, token } = this.makePlayer(name, avatar, 0);
    player.ready = true;
    const room: Room = {
      code,
      hostId: player.id,
      players: [player],
      config: structuredClone(DEFAULT_CONFIG),
      phase: "lobby",
      playlist: [],
      gameIndex: 0,
      roundNumber: 0,
      deadline: null,
      paused: false,
      remaining: null,
      message: "La soirée commence avec vous.",
      createdAt: this.now(),
      updatedAt: this.now(),
      usedContentIds: [],
      gameStartScores: {},
    };
    this.rooms.set(code, room);
    this.changed(room);
    return { room, session: { code, playerId: player.id, token } };
  }
  join(code: string, name: string, avatar: string, spectator = false) {
    const room = this.getRoom(code);
    check(
      room.players.length < 24,
      "Ce salon est complet (24 participants et spectateurs).",
    );
    check(
      !room.players.some(
        (p) =>
          p.name.toLocaleLowerCase("fr") ===
          cleanText(name).toLocaleLowerCase("fr"),
      ),
      "Ce pseudo est déjà pris dans ce salon.",
    );
    const active = room.players.filter((p) => !p.spectator).length;
    check(
      spectator || active < 12 || room.phase !== "lobby",
      "Ce salon compte déjà 12 joueurs. Rejoignez en spectateur.",
    );
    const { player, token } = this.makePlayer(
      name,
      avatar,
      room.players.length,
    );
    player.spectator = spectator || room.phase !== "lobby" || active >= 12;
    player.waiting = !spectator && player.spectator;
    room.players.push(player);
    this.changed(room);
    return { room, session: { code: room.code, playerId: player.id, token } };
  }
  resume(session: Session) {
    const room = this.getRoom(session.code);
    const player = this.getPlayer(room, session.playerId);
    const incoming = Buffer.from(this.hash(session.token), "hex"),
      expected = Buffer.from(player.tokenHash, "hex");
    check(
      incoming.length === expected.length &&
        timingSafeEqual(incoming, expected),
      "Session expirée ou jeton incorrect.",
    );
    player.connected = true;
    this.changed(room);
    return room;
  }
  disconnect(code: string, id: string) {
    const room = this.rooms.get(code);
    if (!room) return;
    const p = room.players.find((p) => p.id === id);
    if (!p) return;
    p.connected = false;
    this.changed(room);
  }
  leave(code: string, id: string) {
    const room = this.getRoom(code);
    const p = this.getPlayer(room, id);
    p.connected = false;
    p.spectator = true;
    p.waiting = false;
    p.tokenHash = "";
    if (room.phase === "lobby")
      room.players = room.players.filter((p) => p.id !== id);
    if (room.hostId === id)
      room.hostId =
        room.players.find((p) => p.connected && !p.spectator)?.id ||
        room.players.find((p) => p.connected)?.id ||
        room.players[0]?.id ||
        "";
    this.changed(room);
  }
  ready(code: string, id: string, ready: boolean) {
    const room = this.getRoom(code);
    check(room.phase === "lobby", "La partie a déjà commencé.");
    const p = this.getPlayer(room, id);
    check(!p.spectator, "Les spectateurs n’ont pas besoin de se préparer.");
    p.ready = ready;
    this.changed(room);
  }
  configure(code: string, id: string, config: RoomConfig) {
    const room = this.getRoom(code);
    this.host(room, id);
    check(
      room.phase === "lobby",
      "Les réglages sont modifiables dans le lobby.",
    );
    room.config = configSchema.parse(config);
    this.changed(room);
  }
  private available(room: Room, gameId: GameId) {
    return this.content.filter(
      (c) =>
        c.gameId === gameId &&
        (!c.adult || room.config.adult) &&
        !room.config.disabledCategories.includes(c.category) &&
        !room.usedContentIds.includes(c.id),
    );
  }
  private pick(room: Room, gameId: GameId) {
    const list = this.available(room, gameId);
    check(
      list.length,
      `Plus de contenus disponibles pour ${GAMES.find((g) => g.id === gameId)?.shortName}. Changez les catégories.`,
    );
    const item = list[this.random(list.length)]!;
    room.usedContentIds.push(item.id);
    return item;
  }
  start(code: string, id: string) {
    const room = this.getRoom(code);
    this.host(room, id);
    check(room.phase === "lobby", "La soirée est déjà lancée.");
    const players = room.players.filter((p) => !p.spectator && p.connected);
    check(players.length >= 3, "Il faut au moins 3 joueurs connectés.");
    check(
      players.every((p) => p.ready),
      "Tous les joueurs doivent être prêts.",
    );
    const playlist = buildPlaylist(room.config, this.random);
    for (const item of playlist)
      check(
        players.length >= GAMES.find((g) => g.id === item.gameId)!.minPlayers,
        `${GAMES.find((g) => g.id === item.gameId)!.shortName} nécessite ${GAMES.find((g) => g.id === item.gameId)!.minPlayers} joueurs.`,
      );
    const needs: Partial<Record<GameId, number>> = {};
    for (const item of playlist)
      needs[item.gameId] =
        (needs[item.gameId] || 0) +
        item.rounds *
          (item.gameId === "pitch" && item.pitchMode !== "invented"
            ? players.length
            : 1);
    room.usedContentIds = [];
    for (const [gameId, count] of Object.entries(needs))
      check(
        this.available(room, gameId as GameId).length >= count,
        `Pas assez de contenus ${gameId} dans les catégories autorisées pour cette soirée.`,
      );
    room.playlist = playlist;
    room.gameIndex = 0;
    room.roundNumber = 1;
    this.beginGame(room);
    this.changed(room);
  }
  private setPhase(room: Room, phase: Phase, seconds: number | null) {
    room.phase = phase;
    room.paused = false;
    room.remaining = null;
    room.deadline = seconds === null ? null : this.now() + seconds * 1000;
  }
  private beginGame(room: Room) {
    room.gameStartScores = Object.fromEntries(
      room.players.map((p) => [p.id, p.score]),
    );
    this.beginRound(room);
  }
  private promote(room: Room) {
    let count = room.players.filter((p) => !p.spectator).length;
    for (const p of room.players)
      if (p.waiting && p.connected && count < 12) {
        p.spectator = false;
        p.waiting = false;
        p.ready = true;
        count++;
      }
  }
  private beginRound(room: Room) {
    this.promote(room);
    const item = room.playlist[room.gameIndex]!;
    // Disconnected players keep their identity and scores, but do not receive a mandatory role.
    const participants = room.players
      .filter((p) => !p.spectator && p.connected)
      .map((p) => p.id);
    if (
      participants.length < GAMES.find((g) => g.id === item.gameId)!.minPlayers
    ) {
      // Keep the planned round intact and wait for the host to resume once friends reconnect.
      room.phase = "intro";
      room.round = undefined;
      room.paused = true;
      room.deadline = null;
      room.remaining = 8000;
      room.message =
        "Pas assez de joueurs connectés pour ce jeu. Reconnectez-vous, puis l’hôte reprend.";
      return;
    }
    const content = this.pick(room, item.gameId);
    const round: Round = {
      id: randomUUID(),
      gameId: item.gameId,
      prompt:
        item.gameId === "pitch"
          ? item.pitchMode === "invented"
            ? "Inventez l’invendable. Quelqu’un d’autre devra le vendre."
            : "Votre mission : vendre l’invendable."
          : content.prompt,
      category:
        item.gameId === "pitch"
          ? item.pitchMode === "invented"
            ? "Vos inventions"
            : "Produits du jeu"
          : content.category,
      mediaUrl: content.mediaUrl,
      participantIds: participants,
      answers: [],
      products: [],
      votes: {},
      ratings: {},
      verdicts: {},
      bestVotes: {},
      submitted: [],
      presentationIndex: 0,
      results: [],
      scored: false,
      voteCounts: {},
    };
    if (item.gameId === "pitch" && item.pitchMode !== "invented") {
      round.products = participants.map((sellerId, index) => {
        const c = index ? this.pick(room, "pitch") : content;
        return {
          ...(c.product || {
            name: c.prompt,
            description: "Le produit dont personne n’avait besoin.",
          }),
          sellerId,
        };
      });
    }
    if (item.gameId === "court") {
      const previous =
        room.playlist
          .slice(0, room.gameIndex)
          .filter((p) => p.gameId === "court")
          .reduce((n, p) => n + p.rounds, 0) +
        room.roundNumber -
        1;
      const order = participants.map(
        (_, i) => participants[(i + previous) % participants.length]!,
      );
      const witnesses = order.length >= 7 ? [order[4]!] : [];
      round.roles = {
        accused: order[0]!,
        prosecutor: order[1]!,
        defense: order[2]!,
        judge: order[3]!,
        jurors: order.slice(witnesses.length ? 5 : 4),
        witnesses,
      };
      round.courtStep = "accusation";
    }
    room.round = round;
    room.message = "Les règles sont simples. Vos réponses le seront moins.";
    for (const p of room.players) p.delta = 0;
    this.setPhase(room, "intro", 8);
  }
  pause(code: string, id: string, paused: boolean) {
    const room = this.getRoom(code);
    this.host(room, id);
    check(
      room.phase !== "lobby" && room.phase !== "podium",
      "Pas de chronomètre à mettre en pause.",
    );
    if (paused === room.paused) return;
    if (paused) {
      room.remaining = Math.max(0, (room.deadline || this.now()) - this.now());
      room.deadline = null;
      room.paused = true;
    } else {
      if (!room.round) {
        this.beginRound(room);
        check(
          room.round,
          "Il manque encore des joueurs pour reprendre ce jeu.",
        );
      } else {
        room.deadline = this.now() + (room.remaining ?? 8000);
        room.remaining = null;
        room.paused = false;
      }
    }
    this.changed(room);
  }
  advance(code: string, id: string, skip = false) {
    const room = this.getRoom(code);
    this.host(room, id);
    check(!room.paused, "Reprenez la partie avant d’avancer.");
    check(
      room.phase !== "lobby" && room.phase !== "podium",
      "Cette étape ne peut pas être passée.",
    );
    if (skip) {
      check(
        room.round?.gameId === "who" && !room.round.scored,
        "On peut passer une question de « Qui parmi nous ? » avant les résultats.",
      );
      this.beginRound(room);
      room.message = "Question suivante. Aucun point attribué.";
    } else this.next(room);
    this.changed(room);
  }
  private prepareProducts(room: Room) {
    const round = room.round!;
    // Missing inventions receive a library fallback so no absent player can block the distribution.
    const own = round.participantIds.map((id, index) => {
      const submitted = round.products.find((p) => p.creatorId === id);
      if (submitted) return submitted;
      const available = this.available(room, "pitch");
      const fallback = available.length
        ? this.pick(room, "pitch").product
        : undefined;
      return {
        ...(fallback || {
          name: `Le bouton panique n°${index + 1}`,
          description:
            "Ne fait rien, mais avec une assurance absolument remarquable.",
        }),
      };
    });
    const distributed = derangement(own, this.random);
    round.products = distributed.map((product, i) => ({
      ...product,
      sellerId: round.participantIds[i],
    }));
  }
  private next(room: Room) {
    const round = room.round;
    if (room.phase === "transition") {
      room.gameIndex++;
      room.roundNumber = 1;
      this.beginGame(room);
      return;
    }
    check(round, "La manche n’est pas disponible.");
    const item = room.playlist[room.gameIndex]!;
    switch (room.phase) {
      case "intro":
        if (round.gameId === "who")
          this.setPhase(room, "voting", room.config.voteSeconds);
        else if (round.gameId === "pitch")
          this.setPhase(
            room,
            item.pitchMode === "invented" ? "writing" : "prepare",
            room.config.answerSeconds,
          );
        else if (round.gameId === "court")
          this.setPhase(room, "prepare", room.config.answerSeconds);
        else this.setPhase(room, "writing", room.config.answerSeconds);
        break;
      case "writing":
        if (round.gameId === "pitch") {
          this.prepareProducts(room);
          this.setPhase(room, "prepare", room.config.answerSeconds);
        } else {
          round.answers = shuffled(round.answers, this.random);
          this.setPhase(room, "voting", room.config.voteSeconds);
        }
        break;
      case "prepare":
        round.presentationIndex = 0;
        round.courtStep = round.gameId === "court" ? STEPS[0] : undefined;
        this.setPhase(room, "presenting", room.config.presentationSeconds);
        break;
      case "presenting":
        round.presentationIndex++;
        if (
          round.gameId === "pitch" &&
          round.presentationIndex < round.products.length
        )
          this.setPhase(room, "presenting", room.config.presentationSeconds);
        else if (
          round.gameId === "court" &&
          round.presentationIndex < STEPS.length
        ) {
          round.courtStep = STEPS[round.presentationIndex];
          this.setPhase(room, "presenting", room.config.presentationSeconds);
        } else this.setPhase(room, "voting", room.config.voteSeconds);
        break;
      case "voting":
        this.score(room);
        this.setPhase(room, "results", 10);
        break;
      case "results":
        if (room.roundNumber < item.rounds) {
          room.roundNumber++;
          this.beginRound(room);
        } else {
          const deltas = room.players.map((p) => ({
            p,
            points: p.score - (room.gameStartScores[p.id] || 0),
          }));
          const best = Math.max(0, ...deltas.map((d) => d.points));
          for (const { p, points } of deltas)
            if (best > 0 && points === best) p.gameWins++;
          if (room.gameIndex === room.playlist.length - 1) {
            this.setPhase(room, "podium", null);
            room.message =
              "La soirée est terminée. Les preuves ont été conservées.";
          } else {
            this.setPhase(room, "transition", room.config.transitionSeconds);
            room.message = MESSAGES[this.random(MESSAGES.length)]!;
          }
        }
        break;
      default:
        break;
    }
  }
  tick() {
    for (const room of this.rooms.values()) {
      if (
        !room.paused &&
        room.deadline !== null &&
        this.now() >= room.deadline
      ) {
        try {
          this.next(room);
          this.changed(room);
        } catch (error) {
          room.paused = true;
          room.remaining = 8000;
          room.deadline = null;
          room.message =
            error instanceof Error ? error.message : "Partie mise en pause.";
          this.changed(room);
          this.options.onError?.(error);
        }
      }
      if (
        !room.players.some((p) => p.connected) &&
        this.now() - room.updatedAt > 7 * 86400_000
      ) {
        this.rooms.delete(room.code);
        this.writes = this.writes
          .catch(() => {})
          .then(() => this.options.store.deleteRoom(room.code));
      }
    }
  }
  private voters(room: Room) {
    return room.round!.participantIds.filter(
      (id) =>
        this.getPlayer(room, id).connected &&
        !this.getPlayer(room, id).spectator,
    );
  }
  private voted(room: Room, id: string) {
    const r = room.round!;
    if (r.gameId === "pitch")
      return r.products
        .filter((p) => p.sellerId !== id)
        .every((p) => !!r.ratings[id]?.[p.sellerId!]);
    if (r.gameId === "court")
      return r.roles!.jurors.includes(id)
        ? id in r.verdicts
        : id in r.bestVotes;
    return id in r.votes;
  }
  action(code: string, id: string, input: Action) {
    const room = this.getRoom(code),
      player = this.getPlayer(room, id),
      action = actionSchema.parse(input),
      round = room.round;
    check(!room.paused, "La partie est en pause.");
    check(
      round && round.participantIds.includes(id) && !player.spectator,
      "Vous pourrez participer à la prochaine manche.",
    );
    check(
      room.deadline === null || this.now() < room.deadline,
      "Le temps est écoulé.",
    );
    if (action.type === "answer") {
      check(
        (room.phase === "writing" &&
          ["mythos", "captions"].includes(round.gameId)) ||
          (room.phase === "prepare" && round.gameId === "court"),
        "Ce n’est pas le moment de répondre.",
      );
      check(!round.submitted.includes(id), "Votre réponse a déjà été envoyée.");
      round.answers.push({
        id: randomUUID(),
        text: cleanText(action.text),
        authorId: id,
      });
      round.submitted.push(id);
    } else if (action.type === "product") {
      check(
        room.phase === "writing" && round.gameId === "pitch",
        "Ce n’est pas le moment d’inventer un produit.",
      );
      check(
        !round.submitted.includes(id),
        "Votre invention a déjà été envoyée.",
      );
      round.products.push({
        name: cleanText(action.name),
        description: cleanText(action.description),
        creatorId: id,
      });
      round.submitted.push(id);
    } else {
      check(room.phase === "voting", "Le vote n’est pas ouvert.");
      if (action.type === "rate") {
        check(
          round.gameId === "pitch",
          "Cette note est réservée aux présentations.",
        );
        check(
          action.targetId !== id,
          "On ne peut pas noter sa propre présentation.",
        );
        check(
          round.products.some((p) => p.sellerId === action.targetId),
          "Présentation inconnue.",
        );
        round.ratings[id] ??= {};
        check(
          room.config.allowVoteChange || !round.ratings[id]![action.targetId],
          "Cette évaluation est déjà enregistrée.",
        );
        round.ratings[id]![action.targetId] = [
          action.humor,
          action.conviction,
          action.creativity,
        ];
      } else if (action.type === "verdict") {
        check(
          round.gameId === "court" && round.roles!.jurors.includes(id),
          "Seuls les jurés rendent un verdict.",
        );
        check(
          room.config.allowVoteChange || !(id in round.verdicts),
          "Votre verdict est déjà enregistré.",
        );
        if (action.bestPlayerId) {
          check(
            action.bestPlayerId !== id &&
              round.participantIds.includes(action.bestPlayerId),
            "Choisissez une autre personne pour la meilleure intervention.",
          );
          round.bestVotes[id] = action.bestPlayerId;
        }
        round.verdicts[id] = action.guilty;
      } else {
        check(action.type === "vote", "Action inconnue.");
        if (round.gameId === "court") {
          check(
            round.participantIds.includes(action.targetId) &&
              action.targetId !== id,
            "Choisissez un autre participant.",
          );
          check(
            room.config.allowVoteChange || !(id in round.bestVotes),
            "Votre vote est déjà enregistré.",
          );
          round.bestVotes[id] = action.targetId;
        } else {
          check(
            round.gameId !== "pitch",
            "Évaluez les trois critères de la présentation.",
          );
          check(
            room.config.allowVoteChange || !(id in round.votes),
            "Votre vote est déjà enregistré.",
          );
          if (round.gameId === "who")
            check(
              round.participantIds.includes(action.targetId) &&
                (room.config.allowSelfVoteWho || action.targetId !== id),
              "Choisissez un autre joueur de cette manche.",
            );
          else
            check(
              round.answers.some(
                (a) => a.id === action.targetId && a.authorId !== id,
              ),
              "Choisissez la réponse d’un autre joueur.",
            );
          round.votes[id] = action.targetId;
        }
      }
    }
    const active = this.voters(room);
    if (
      room.phase === "writing" &&
      active.length &&
      active.every((p) => round.submitted.includes(p))
    )
      this.next(room);
    if (
      room.phase === "voting" &&
      !room.config.allowVoteChange &&
      active.length &&
      active.every((p) => this.voted(room, p))
    )
      this.next(room);
    this.changed(room);
  }
  private score(room: Room) {
    const round = room.round!;
    if (round.scored) return;
    let results: RoundResult[] = [];
    if (round.gameId === "mythos" || round.gameId === "captions") {
      results = writingScores(round.answers, round.votes);
      round.voteCounts = topTargets(round.votes).counts;
    } else if (round.gameId === "who") {
      const result = whoScores(round.votes, room.config.whoNoPoints);
      results = result.results;
      round.voteCounts = result.counts;
      round.title = [
        "Ministre de la mauvaise idée",
        "Ambassadeur du chaos",
        "Légende de la soirée",
      ][this.random(3)];
    } else if (round.gameId === "pitch") {
      for (const product of round.products) {
        const notes = Object.values(round.ratings)
          .map((r) => r[product.sellerId!])
          .filter((r): r is [number, number, number] => !!r);
        const average = notes.length
          ? notes.reduce((n, r) => n + (r[0] + r[1] + r[2]) / 3, 0) /
            notes.length
          : 0;
        results.push({
          playerId: product.sellerId!,
          points: Math.round(average * 100),
          rating: Math.round(average * 10) / 10,
          reason: "Moyenne humour, conviction et créativité",
        });
        if (product.creatorId && average >= 4)
          results.push({
            playerId: product.creatorId,
            points: 100,
            reason: "Bonus invention brillante",
          });
      }
    } else {
      const roles = round.roles!,
        guilty = Object.values(round.verdicts).filter(Boolean).length,
        innocent = Object.values(round.verdicts).length - guilty;
      round.verdict = guilty > innocent ? "guilty" : "innocent";
      round.voteCounts = { guilty, innocent };
      for (const playerId of round.verdict === "guilty"
        ? [roles.prosecutor]
        : [roles.defense, roles.accused])
        results.push({
          playerId,
          points: 300,
          reason:
            round.verdict === "guilty"
              ? "Condamnation obtenue"
              : "Acquittement (égalité favorable à la défense)",
        });
      const best = topTargets(round.bestVotes);
      for (const playerId of best.winners)
        results.push({
          playerId,
          points: 150,
          reason: "Meilleure intervention",
          votes: best.counts[playerId],
        });
    }
    const ranks = this.ranked(room);
    for (const player of room.players)
      player.previousRank = ranks.find((p) => p.id === player.id)?.rank || 0;
    const balance =
      room.config.balanced && ["mythos", "captions"].includes(round.gameId)
        ? Math.min(1, 4 / Math.max(1, round.participantIds.length - 1))
        : 1;
    round.results = results.map((r) => ({
      ...r,
      points: Math.round(
        r.points * balance * room.config.coefficients[round.gameId],
      ),
    }));
    for (const result of round.results) {
      const p = this.getPlayer(room, result.playerId);
      p.score += result.points;
      p.delta += result.points;
      p.history.push({
        gameId: round.gameId,
        points: result.points,
        reason: result.reason,
      });
    }
    const max = Math.max(0, ...room.players.map((p) => p.delta));
    for (const p of room.players) if (max > 0 && p.delta === max) p.roundWins++;
    round.scored = true;
  }
  replay(code: string, id: string) {
    const room = this.getRoom(code);
    this.host(room, id);
    check(room.phase === "podium", "Terminez la soirée avant de rejouer.");
    for (const player of room.players) {
      player.score = 0;
      player.delta = 0;
      player.history = [];
      player.roundWins = 0;
      player.gameWins = 0;
      player.ready = player.id === id;
      player.previousRank = 0;
    }
    this.promote(room);
    room.round = undefined;
    room.playlist = [];
    room.gameIndex = 0;
    room.roundNumber = 0;
    room.usedContentIds = [];
    room.paused = false;
    room.deadline = null;
    room.phase = "lobby";
    room.message = "Même équipe. Nouvelle chance de faire pire.";
    this.changed(room);
  }
  private ranked(room: Room) {
    const players = [...room.players].sort(
      (a, b) => b.score - a.score || a.name.localeCompare(b.name, "fr"),
    );
    let rank = 0;
    return players.map((p, index) => {
      if (index === 0 || p.score !== players[index - 1]!.score)
        rank = index + 1;
      return { ...p, rank };
    });
  }
  snapshot(room: Room, id: string): RoomSnapshot {
    const player = this.getPlayer(room, id),
      round = room.round;
    const reveal =
      room.phase === "results" ||
      room.phase === "transition" ||
      room.phase === "podium";
    const scoresVisible =
      room.phase === "lobby" ||
      room.phase === "podium" ||
      (room.config.leaderboard === "round" && room.phase === "results") ||
      (room.config.leaderboard !== "final" && room.phase === "transition");
    const ranked = this.ranked(room);
    const displayOrder = scoresVisible
      ? ranked
      : room.players.map((p) => ({ ...p, rank: 0 }));
    const players: PlayerView[] = displayOrder.map((p) => {
      const totals: Partial<Record<GameId, number>> = {};
      for (const h of p.history)
        totals[h.gameId] = (totals[h.gameId] || 0) + h.points;
      const bestGame = Object.entries(totals).sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0] as GameId | undefined;
      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        color: p.color,
        connected: p.connected,
        ready: p.ready,
        spectator: p.spectator,
        score: scoresVisible ? p.score : 0,
        delta: scoresVisible ? p.delta : 0,
        rank: scoresVisible ? p.rank : 0,
        previousRank: scoresVisible ? p.previousRank : 0,
        roundWins: scoresVisible ? p.roundWins : 0,
        gameWins: scoresVisible ? p.gameWins : 0,
        bestGame: scoresVisible ? bestGame : undefined,
        history: scoresVisible ? p.history : [],
      };
    });
    const ownAnswer = round?.answers.find((a) => a.authorId === id);
    const ownProduct =
      round?.products.find((p) => p.sellerId === id) ||
      round?.products.find((p) => p.creatorId === id);
    let courtRole: string | undefined;
    if (round?.roles)
      for (const [role, value] of Object.entries(round.roles))
        if (Array.isArray(value) ? value.includes(id) : value === id)
          courtRole = role;
    const publicProduct = (p: Product) => ({
      name: p.name,
      description: p.description,
      ...(p.sellerId ? { sellerId: p.sellerId } : {}),
      ...(reveal && p.creatorId ? { creatorId: p.creatorId } : {}),
    });
    const phaseAllowsAnswers =
      round?.gameId !== "court" && (room.phase === "voting" || reveal);
    const currentProduct =
      round?.gameId === "pitch" && room.phase === "presenting"
        ? round.products[round.presentationIndex]
        : undefined;
    let currentSpeakerId = currentProduct?.sellerId;
    if (round?.roles && room.phase === "presenting")
      currentSpeakerId =
        round.courtStep === "accusation"
          ? round.roles.prosecutor
          : round.courtStep === "defense"
            ? round.roles.defense
            : round.courtStep === "questions"
              ? round.roles.judge
              : round.roles.accused;
    const gamePoints = Object.fromEntries(
      room.players
        .filter((p) => !p.spectator)
        .map((p) => [p.id, p.score - (room.gameStartScores[p.id] || 0)]),
    );
    const bestGamePoints = Math.max(0, ...Object.values(gamePoints));
    const gameSummary =
      scoresVisible && (room.phase === "transition" || room.phase === "podium")
        ? {
            points: gamePoints,
            winnerIds: Object.keys(gamePoints).filter(
              (id) => bestGamePoints > 0 && gamePoints[id] === bestGamePoints,
            ),
          }
        : undefined;
    return {
      code: room.code,
      hostId: room.hostId,
      phase: room.phase,
      config: structuredClone(room.config),
      players,
      playlist: structuredClone(room.playlist),
      gameIndex: room.gameIndex,
      roundNumber: room.roundNumber,
      totalRounds: room.playlist[room.gameIndex]?.rounds || 0,
      round: round
        ? {
            id: round.id,
            gameId: round.gameId,
            prompt: round.prompt,
            category: round.category,
            mediaUrl: round.mediaUrl,
            answers: phaseAllowsAnswers
              ? round.answers.map((a) => ({
                  id: a.id,
                  text: a.text,
                  ...(reveal || round.gameId === "court"
                    ? { authorId: a.authorId }
                    : {}),
                  ...(reveal ? { votes: round.voteCounts[a.id] || 0 } : {}),
                }))
              : [],
            products:
              round.gameId === "pitch" && (room.phase === "voting" || reveal)
                ? round.products.map(publicProduct)
                : undefined,
            currentProduct: currentProduct
              ? publicProduct(currentProduct)
              : undefined,
            currentSpeakerId,
            presentationIndex: round.presentationIndex,
            courtStep: round.courtStep,
            roles: round.roles ? structuredClone(round.roles) : undefined,
            submittedCount: round.submitted.length,
            eligibleCount: round.participantIds.length,
            votedCount: this.voters(room).filter((p) => this.voted(room, p))
              .length,
            results: reveal
              ? round.results.map((r) => ({
                  ...r,
                  points: scoresVisible ? r.points : 0,
                }))
              : [],
            verdict: reveal ? round.verdict : undefined,
            voteCounts: reveal ? structuredClone(round.voteCounts) : undefined,
            votesByPlayer:
              reveal && !room.config.anonymousVotes
                ? structuredClone(
                    round.gameId === "court" ? round.bestVotes : round.votes,
                  )
                : undefined,
            title: reveal ? round.title : undefined,
          }
        : undefined,
      me: {
        id,
        submitted: round?.submitted.includes(id) || false,
        voted: round ? this.voted(room, id) : false,
        answer: ownAnswer?.text,
        answerId: ownAnswer?.id,
        product: ownProduct ? publicProduct(ownProduct) : undefined,
        vote: round?.votes[id] || round?.bestVotes[id],
        ratings: round?.ratings[id]
          ? structuredClone(round.ratings[id])
          : undefined,
        courtRole,
      },
      deadline: room.deadline,
      paused: room.paused,
      serverTime: this.now(),
      inviteUrl: `${this.publicUrl}/?room=${room.code}`,
      message: room.message,
      scoresVisible,
      gameSummary,
    };
  }
  async updateContent(content: ContentItem[]) {
    await this.options.store.saveContent(content);
    this.content = structuredClone(content);
  }
}
