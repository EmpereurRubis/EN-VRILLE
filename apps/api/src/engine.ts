import {
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { CONTENT } from "@en-vrille/content";
import type { ContentItem } from "@en-vrille/content";
import cinemaCatalogue from "../../../packages/content/cinema/catalogue.json";
import decoyCatalogue from "../../../packages/content/decoys/catalogue.json";
import { AVATARS, COLORS, DEFAULT_CONFIG, GAMES, REACTIONS } from "@en-vrille/shared";
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
  ParticipationProgress,
  CinemaScene,
  DecoyProduct,
  CaptionStoryView,
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
const RECONNECT_GRACE = 10_000;
const REACTION_TTL = 6_000;
const MISSION_WORDS = ["cornichon", "chaussette", "pamplemousse", "licorne", "trombone", "moustache"];
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
  cinema: CinemaScene[] = structuredClone(cinemaCatalogue as CinemaScene[]);
  decoys: DecoyProduct[] = structuredClone(decoyCatalogue as DecoyProduct[]);
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
    if (saved.content) {
      const builtins = new Map(CONTENT.map((item) => [item.id, item]));
      this.content = saved.content.map((item) => {
        const original = builtins.get(item.id);
        return { ...item, promptEn: item.promptEn || (original?.prompt === item.prompt ? original.promptEn : undefined) };
      });
    }
    if (saved.cinema) this.cinema = saved.cinema;
    if (saved.decoys) this.decoys = saved.decoys;
    for (const room of saved.rooms) {
      if (this.now() - room.updatedAt > 7 * 86400_000) continue;
      room.config = { ...structuredClone(DEFAULT_CONFIG), ...room.config };
      room.phaseStartedAt ??= room.updatedAt;
      room.phaseExcludedIds ??= [];
      room.reactions = [];
      room.lastReactionAt = {};
      room.usedDecoyIds ??= [];
      room.usedCinemaIds ??= [];
      if (room.round) {
        room.round.prepared ??= [];
        room.round.missions ??= {};
        room.round.pitchRatedSellerIds ??= [];
        room.round.suggestions ??= {};
        if (room.round.gameId === "pitch")
          room.round.presentationIndex = Math.min(Math.max(0, room.round.presentationIndex), Math.max(0, room.round.products.length - 1));
        if (room.round.gameId === "captions" && !room.round.captions && !room.round.scored) {
          room.round = undefined;
          room.phase = "intro";
        }
      }
      for (const player of room.players) {
        player.connected = false;
        player.disconnectedAt = this.now();
      }
      if (room.phase !== "lobby" && room.phase !== "podium") {
        room.remaining = room.paused
          ? room.remaining
          : Math.max(1000, (room.deadline || this.now() + 30_000) - this.now());
        room.paused = true;
        room.pausedAt = this.now();
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
  create(name: string, avatar: string, hostPlays = true) {
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
    player.spectator = !hostPlays;
    const room: Room = {
      code,
      hostId: player.id,
      players: [player],
      config: structuredClone(DEFAULT_CONFIG),
      phase: "lobby",
      phaseStartedAt: this.now(),
      phaseExcludedIds: [],
      reactions: [],
      lastReactionAt: {},
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
      usedDecoyIds: [],
      usedCinemaIds: [],
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
    if (!player.connected && player.disconnectedAt !== undefined &&
        this.now() - player.disconnectedAt >= RECONNECT_GRACE &&
        room.round?.participantIds.includes(player.id) && !room.phaseExcludedIds.includes(player.id))
      room.phaseExcludedIds.push(player.id);
    player.connected = true;
    delete player.disconnectedAt;
    this.completeIfReady(room);
    this.changed(room);
    return room;
  }
  disconnect(code: string, id: string) {
    const room = this.rooms.get(code);
    if (!room) return;
    const p = room.players.find((p) => p.id === id);
    if (!p) return;
    p.connected = false;
    p.disconnectedAt = this.now();
    this.changed(room);
  }
  leave(code: string, id: string) {
    const room = this.getRoom(code);
    const p = this.getPlayer(room, id);
    p.connected = false;
    p.disconnectedAt = this.now() - RECONNECT_GRACE;
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
    this.completeIfReady(room);
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
    const localized = structuredClone(item) as ContentItem & { promptEn?: string; product?: { name: string; description: string; nameEn?: string; descriptionEn?: string } };
    if (room.config.language === "en") {
      localized.prompt = localized.promptEn || localized.prompt;
      if (localized.product) localized.product = { ...localized.product,
        name: localized.product.nameEn || localized.product.name,
        description: localized.product.descriptionEn || localized.product.description };
    }
    return localized;
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
    room.usedDecoyIds = [];
    room.usedCinemaIds = [];
    for (const [gameId, count] of Object.entries(needs))
      if (gameId !== "captions" && !(gameId === "pitch" && this.decoys.length)) check(
        this.available(room, gameId as GameId).length >= count,
        `Pas assez de contenus ${gameId} dans les catégories autorisées pour cette soirée.`,
      );
    if (playlist.some((item) => item.gameId === "pitch" && item.pitchMode !== "invented") && this.decoys.length)
      check(this.decoys.filter((product) => !room.config.disabledCategories.includes(product.category)).length >= players.length,
        "Il faut au moins un produit du studio autorisé par vendeur.");
    if (playlist.some((item) => item.gameId === "captions"))
      check(this.cinema.filter((scene) => this.sceneAllowed(room, scene, this.captionTurns(room, players.length))).length >= players.length,
        "La bibliothèque doit contenir une scène autorisée différente par joueur, avec assez d’images pour cette durée.");
    room.playlist = playlist;
    room.gameIndex = 0;
    room.roundNumber = 1;
    this.beginGame(room);
    this.setPhase(room, "party-intro", 6);
    this.changed(room);
  }
  private setPhase(room: Room, phase: Phase, seconds: number | null) {
    room.phase = phase;
    room.phaseStartedAt = this.now();
    room.phaseExcludedIds = room.round?.participantIds.filter((id) => {
      const player = this.getPlayer(room, id);
      return player.spectator || (!player.connected && this.now() - (player.disconnectedAt ?? this.now()) >= RECONNECT_GRACE);
    }) || [];
    room.paused = false;
    delete room.pausedAt;
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
      room.round = undefined;
      this.setPhase(room, "intro", null);
      room.paused = true;
      room.pausedAt = this.now();
      room.deadline = null;
      room.remaining = 8000;
      room.message =
        "Pas assez de joueurs connectés pour ce jeu. Reconnectez-vous, puis l’hôte reprend.";
      return;
    }
    const usingStudioProducts = item.gameId === "pitch" && item.pitchMode !== "invented" && this.decoys.length > 0;
    const content: ContentItem = item.gameId === "captions"
      ? { id: "collaborative-cinema", gameId: "captions", prompt: room.config.language === "en" ? "Rewrite cinema together. Each scene will find its voice." : "Réinventez les dialogues du cinéma, une réplique à la fois.", category: "cinéma collaboratif", mediaUrl: undefined }
      : usingStudioProducts ? { id: "studio-products", gameId: "pitch", prompt: "Studio products", category: "studio" }
      : this.pick(room, item.gameId);
    const round: Round = {
      id: randomUUID(),
      gameId: item.gameId,
      prompt:
        item.gameId === "pitch"
          ? item.pitchMode === "invented"
            ? room.config.language === "en" ? "Invent the unsellable. Someone else will have to sell it." : "Inventez l’invendable. Quelqu’un d’autre devra le vendre."
            : room.config.language === "en" ? "Your mission: sell the unsellable." : "Votre mission : vendre l’invendable."
          : content.prompt,
      category:
        item.gameId === "pitch"
          ? item.pitchMode === "invented"
            ? room.config.language === "en" ? "Your inventions" : "Vos inventions"
            : room.config.language === "en" ? "Studio products" : "Produits du jeu"
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
      prepared: [],
      missions: {},
      presentationIndex: 0,
      results: [],
      scored: false,
      voteCounts: {},
      suggestions: {},
      pitchRatedSellerIds: [],
    };
    if (item.gameId === "pitch" && item.pitchMode !== "invented") {
      round.products = participants.map((sellerId, index) => {
        if (usingStudioProducts) return { ...this.drawDecoy(room), sellerId, generated: true };
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
    if (item.gameId === "captions") {
      const turns = this.captionTurns(room, participants.length);
      const all = this.cinema.filter((scene) => this.sceneAllowed(room, scene, turns));
      let available = all.filter((scene) => !room.usedCinemaIds!.includes(scene.id));
      if (available.length < participants.length) {
        room.usedCinemaIds = [];
        available = all;
      }
      check(available.length >= participants.length, "Il manque des scènes autorisées pour les scénaristes connectés.");
      const scenes = shuffled(available, this.random).slice(0, participants.length);
      room.usedCinemaIds!.push(...scenes.map((scene) => scene.id));
      const presenters = derangement(participants, this.random);
      round.captions = {
        turn: 0, turns, slideIndex: 0, autoSlides: room.config.captionAutoSlides,
        slideStartedAt: this.now(), awardVotes: {},
        stories: scenes.map((scene, i) => ({
          id: randomUUID(), starterId: participants[i]!, presenterId: presenters[i]!,
          scene: { ...structuredClone(scene), frames: Array.from({ length: turns }, (_, frameIndex) =>
            structuredClone(scene.frames[Math.round(frameIndex * (scene.frames.length - 1) / Math.max(1, turns - 1))]!)) },
          lines: [],
        })),
      };
    }
    room.round = round;
    if (room.config.secretRoles && ["mythos", "pitch"].includes(round.gameId) &&
        (round.gameId !== "pitch" || item.pitchMode === "invented")) {
      for (const id of participants) round.missions[id] = { word: MISSION_WORDS[this.random(MISSION_WORDS.length)]!, completed: false };
    }
    room.message = room.config.language === "en" ? "The rules are simple. Your answers probably won't be." : "Les règles sont simples. Vos réponses le seront moins.";
    for (const p of room.players) p.delta = 0;
    this.setPhase(room, "intro", 4);
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
      room.pausedAt = this.now();
    } else {
      if (!room.round) {
        this.beginRound(room);
        check(
          room.round,
          "Il manque encore des joueurs pour reprendre ce jeu.",
        );
      } else {
        const pauseDuration = this.now() - (room.pausedAt ?? this.now());
        room.phaseStartedAt += pauseDuration;
        if (room.round.captions) room.round.captions.slideStartedAt += pauseDuration;
        room.deadline = this.now() + (room.remaining ?? 8000);
        room.remaining = null;
        room.paused = false;
        delete room.pausedAt;
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
      const fallback = this.decoys.length ? this.drawDecoy(room) : undefined;
      return {
        ...(fallback ? { name: fallback.name, description: fallback.description, generated: true } : {
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
  private captionTurns(room: Room, players: number) {
    return room.config.captionLength === "short" ? Math.min(4, players) : room.config.captionLength === "normal" ? Math.min(5, players) : players;
  }
  private sceneAllowed(room: Room, scene: CinemaScene, frames: number) {
    return scene.rights.commercialUse === true && scene.frames.length >= frames &&
      !room.config.disabledCategories.includes(scene.category);
  }
  private captionAssignment(round: Round, playerId: string) {
    const cinema = round.captions!;
    const playerIndex = round.participantIds.indexOf(playerId);
    return playerIndex < 0 ? undefined : cinema.stories[(playerIndex - cinema.turn + round.participantIds.length) % round.participantIds.length];
  }
  private captionStoryView(story: NonNullable<Round["captions"]>["stories"][number], reveal: boolean): CaptionStoryView {
    return {
      id: story.id, title: story.scene.title, scene: structuredClone(story.scene), presenterId: story.presenterId,
      ...(reveal ? { starterId: story.starterId } : {}),
      lines: story.lines.map((line) => ({ id: line.id, text: line.text, frameIndex: line.frameIndex,
        ...(reveal && line.authorId ? { authorId: line.authorId } : {}) })),
    };
  }
  private fillCaptionTurn(round: Round) {
    const cinema = round.captions!;
    for (const story of cinema.stories) if (!story.lines.some((line) => line.frameIndex === cinema.turn))
      story.lines.push({ id: randomUUID(), text: "…", frameIndex: cinema.turn, authorId: "" });
  }
  private drawDecoy(room: Room) {
    const allowed = this.decoys.filter((item) => !room.config.disabledCategories.includes(item.category));
    let available = allowed.filter((item) => !room.usedDecoyIds!.includes(item.id));
    if (!available.length && allowed.length) { room.usedDecoyIds = []; available = allowed; }
    check(available.length, "La machine à idées est vide dans les catégories autorisées.");
    const product = available[this.random(available.length)]!;
    room.usedDecoyIds!.push(product.id);
    return {
      name: room.config.language === "en" ? product.nameEn || product.name : product.name,
      description: room.config.language === "en" ? product.descriptionEn || product.description : product.description,
    };
  }
  suggestProduct(code: string, id: string) {
    const room = this.getRoom(code), player = this.getPlayer(room, id), round = room.round;
    check(!room.paused && room.phase === "writing" && round?.gameId === "pitch" &&
      player.connected && this.eligible(room).includes(id), "La machine à idées est disponible pendant la création de votre objet.");
    check(!round.submitted.includes(id), "Votre invention est déjà validée.");
    const suggestion = this.drawDecoy(room);
    round.suggestions ??= {};
    round.suggestions[id] = { token: randomUUID(), ...suggestion };
    this.changed(room);
  }
  captionControl(code: string, id: string, control: { direction?: "next" | "previous"; autoSlides?: boolean }) {
    const room = this.getRoom(code), round = room.round, cinema = round?.captions;
    check(!room.paused && room.phase === "presenting" && round && cinema, "Le projecteur n’est pas encore ouvert.");
    const story = cinema.stories[round.presentationIndex]!;
    check(id === room.hostId || id === story.presenterId, "Seuls le présentateur et l’hôte peuvent piloter les diapositives.");
    if (control.autoSlides !== undefined) {
      this.host(room, id);
      cinema.autoSlides = control.autoSlides;
    }
    if (control.direction)
      cinema.slideIndex = Math.max(0, Math.min(story.scene.frames.length - 1, cinema.slideIndex + (control.direction === "next" ? 1 : -1)));
    cinema.slideStartedAt = this.now();
    this.changed(room);
  }
  private finishRound(room: Room) {
    const item = room.playlist[room.gameIndex]!;
    if (room.roundNumber < item.rounds) {
      room.roundNumber++;
      this.beginRound(room);
      return;
    }
    const deltas = room.players.filter((p) => !p.spectator).map((p) => ({
      p, points: p.score - (room.gameStartScores[p.id] || 0),
    }));
    const best = Math.max(0, ...deltas.map((d) => d.points));
    for (const { p, points } of deltas)
      if (best > 0 && points === best) p.gameWins++;
    if (room.gameIndex === room.playlist.length - 1) {
      this.setPhase(room, "podium", null);
      room.message = room.config.language === "en" ? "The party is over. We kept the evidence." : "La soirée est terminée. Les preuves ont été conservées.";
    } else {
      this.setPhase(room, "transition", room.config.transitionSeconds);
      room.message = MESSAGES[this.random(MESSAGES.length)]!;
    }
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
      case "party-intro":
        this.setPhase(room, "intro", 4);
        break;
      case "intro":
        this.setPhase(room, "rules", 21);
        break;
      case "rules":
        if (round.gameId === "who")
          this.setPhase(room, "voting", room.config.voteSeconds);
        else if (round.gameId === "pitch")
          this.setPhase(room, item.pitchMode === "invented" ? "writing" : "prepare", room.config.answerSeconds);
        else if (round.gameId === "court")
          this.setPhase(room, "prepare", room.config.answerSeconds);
        else this.setPhase(room, "writing", room.config.answerSeconds);
        break;
      case "writing":
        if (round.gameId === "captions" && round.captions) {
          this.fillCaptionTurn(round);
          if (round.captions.turn < round.captions.turns - 1) {
            round.captions.turn++;
            round.submitted = [];
            this.setPhase(room, "writing", room.config.answerSeconds);
          } else this.setPhase(room, "reveal", 5);
        } else if (round.gameId === "pitch") {
          this.prepareProducts(room);
          this.setPhase(room, "prepare", room.config.answerSeconds);
        } else {
          round.answers = shuffled(round.answers, this.random);
          this.setPhase(room, "reveal", Math.min(24, Math.max(4, round.answers.length * 2.5)));
        }
        break;
      case "reveal":
        this.setPhase(room, round.captions ? "prepare" : "voting", round.captions ? room.config.answerSeconds : room.config.voteSeconds);
        this.completeIfReady(room);
        break;
      case "prepare":
        round.presentationIndex = 0;
        round.courtStep = round.gameId === "court" ? STEPS[0] : undefined;
        if (round.captions) {
          round.captions.slideIndex = 0;
          round.captions.slideStartedAt = this.now();
        }
        this.setPhase(room, "presenting", room.config.presentationSeconds);
        break;
      case "presenting":
        if (round.gameId === "pitch") {
          this.setPhase(room, "voting", room.config.voteSeconds);
          this.completeIfReady(room);
          break;
        }
        round.presentationIndex++;
        if (round.captions && round.presentationIndex < round.captions.stories.length) {
          round.captions.slideIndex = 0;
          round.captions.slideStartedAt = this.now();
          this.setPhase(room, "presenting", room.config.presentationSeconds);
        } else if (round.gameId === "court" && round.presentationIndex < STEPS.length) {
          round.courtStep = STEPS[round.presentationIndex];
          this.setPhase(room, "presenting", room.config.presentationSeconds);
        } else {
          if (round.captions) round.presentationIndex = round.captions.stories.length - 1;
          this.setPhase(room, "voting", room.config.voteSeconds);
          this.completeIfReady(room);
        }
        break;
      case "voting":
        if (round.gameId === "pitch") {
          round.pitchRatedSellerIds ??= [];
          const seller = round.products[round.presentationIndex]?.sellerId;
          if (seller && !round.pitchRatedSellerIds.includes(seller)) round.pitchRatedSellerIds.push(seller);
          if (round.presentationIndex === round.products.length - 1) this.score(room);
          this.setPhase(room, "results", round.scored ? 10 : 6);
        } else {
          this.score(room);
          this.setPhase(room, "results", 10);
        }
        break;
      case "results":
        if (round.gameId === "pitch" && !round.scored) {
          round.presentationIndex++;
          this.setPhase(room, "presenting", room.config.presentationSeconds);
          break;
        }
        if (!room.config.noPoints && (room.config.leaderboard === "round" ||
            (room.config.leaderboard === "game" && room.roundNumber === item.rounds)))
          this.setPhase(room, "leaderboard", 8);
        else this.finishRound(room);
        break;
      case "leaderboard":
        this.finishRound(room);
        break;
    }
  }
  tick() {
    for (const room of this.rooms.values()) {
      let dirty = false;
      const recent = room.reactions.filter((r) => this.now() - r.createdAt < REACTION_TTL);
      if (recent.length !== room.reactions.length) {
        room.reactions = recent;
        dirty = true;
      }
      if (room.round) {
        for (const id of room.round.participantIds) {
          const player = this.getPlayer(room, id);
          if (!player.connected && this.now() - (player.disconnectedAt ?? this.now()) >= RECONNECT_GRACE &&
              !room.phaseExcludedIds.includes(id)) {
            room.phaseExcludedIds.push(id);
            dirty = true;
          }
        }
        if (!room.paused && dirty) this.completeIfReady(room);
      }
      const cinema = room.round?.captions;
      if (!room.paused && room.phase === "presenting" && cinema?.autoSlides &&
          this.now() - cinema.slideStartedAt >= room.config.captionSlideSeconds * 1000) {
        const story = cinema.stories[room.round!.presentationIndex]!;
        if (cinema.slideIndex < story.scene.frames.length - 1) {
          cinema.slideIndex++;
          cinema.slideStartedAt = this.now();
          dirty = true;
        }
      }
      if (!room.paused && room.deadline !== null && this.now() >= room.deadline) {
        try {
          // An oral contribution is never interrupted by a timer. The host owns its closing signal.
          if (this.manualAdvanceRequired(room)) {
            room.deadline = null;
            room.remaining = 0;
          } else this.next(room);
          dirty = true;
        } catch (error) {
          room.paused = true;
          room.pausedAt = this.now();
          room.remaining = 8000;
          room.deadline = null;
          room.message = error instanceof Error ? error.message : "Partie mise en pause.";
          dirty = true;
          this.options.onError?.(error);
        }
      }
      if (dirty) this.changed(room);
      if (!room.players.some((p) => p.connected) && this.now() - room.updatedAt > 7 * 86400_000) {
        this.rooms.delete(room.code);
        this.writes = this.writes.catch(() => {}).then(() => this.options.store.deleteRoom(room.code));
      }
    }
  }
  private manualAdvanceRequired(room: Room) {
    return room.phase === "presenting" || (!room.config.autoAdvance &&
      ["party-intro", "intro", "rules", "reveal", "results", "leaderboard", "transition"].includes(room.phase));
  }
  private eligible(room: Room) {
    return room.round?.participantIds.filter((id) => {
      const player = this.getPlayer(room, id);
      return !player.spectator && !room.phaseExcludedIds.includes(id);
    }) || [];
  }
  private rateTargets(room: Room, id: string) {
    const product = room.round!.products[room.round!.presentationIndex];
    return product?.sellerId && product.sellerId !== id ? [product] : [];
  }
  private voters(room: Room) {
    const r = room.round!;
    return this.eligible(room).filter((id) => {
      if (r.gameId === "pitch") return this.rateTargets(room, id).length > 0;
      if (r.captions) return true;
      if (r.gameId === "mythos" || r.gameId === "captions") return r.answers.some((a) => a.authorId !== id);
      if (r.gameId === "who") return room.config.allowSelfVoteWho || r.participantIds.some((p) => p !== id);
      return true;
    });
  }
  private voted(room: Room, id: string) {
    const r = room.round!;
    if (r.captions) {
      const targets = this.captionVoteTargets(r, id);
      return (["film", "actor", "line"] as const).every((award) => targets[award].length === 0 || !!r.captions!.awardVotes[id]?.[award]);
    }
    if (r.gameId === "pitch")
      return this.rateTargets(room, id).length > 0 && this.rateTargets(room, id).every((p) => !!r.ratings[id]?.[p.sellerId!]);
    if (r.gameId === "court")
      return r.roles!.jurors.includes(id) ? id in r.verdicts : id in r.bestVotes;
    return id in r.votes;
  }
  private captionVoteTargets(round: Round, id: string) {
    const stories = round.captions!.stories;
    return {
      film: stories.map((story) => story.id),
      actor: stories.map((story) => story.presenterId).filter((presenter) => presenter !== id),
      line: stories.flatMap((story) => story.lines.filter((line) => line.authorId && line.authorId !== id).map((line) => line.id)),
    };
  }
  private progress(room: Room): ParticipationProgress[] {
    const label = (fr: string, en: string) => room.config.language === "en" ? en : fr;
    const row = (kind: ParticipationProgress["kind"], label: string, ids: string[], completed: (id: string) => boolean) =>
      ({ kind, label, completed: ids.filter(completed).length, total: ids.length });
    if (room.phase === "lobby") {
      const players = room.players.filter((p) => p.connected && !p.spectator);
      return [{ kind: "ready", label: label("Joueurs prêts", "Players ready"), completed: players.filter((p) => p.ready).length, total: players.length }];
    }
    const r = room.round;
    if (!r) return [];
    const active = this.eligible(room);
    if (room.phase === "writing") return [row(r.gameId === "pitch" ? "products" : "answers",
      r.gameId === "pitch" ? label("Objets créés", "Products created") : r.gameId === "captions" ? label("Scénaristes prêts", "Writers ready") : label("Réponses reçues", "Answers received"),
      active, (id) => r.submitted.includes(id))];
    if (room.phase === "prepare") return [row("prepared", label("Joueurs prêts", "Players ready"), active, (id) => r.prepared.includes(id))];
    if (room.phase !== "voting") return [];
    const voters = this.voters(room);
    if (r.gameId === "court") return [
      row("verdicts", label("Jurés ayant voté", "Jurors voted"), voters.filter((id) => r.roles!.jurors.includes(id)), (id) => id in r.verdicts),
      row("bonus-votes", label("Votes meilleure intervention", "Best intervention votes"), voters.filter((id) => !r.roles!.jurors.includes(id)), (id) => id in r.bestVotes),
    ];
    return [row(r.gameId === "pitch" ? "ratings" : "votes", r.gameId === "pitch" ? label("Évaluations terminées", "Ratings received") : label("Votes enregistrés", "Votes recorded"), voters, (id) => this.voted(room, id))];
  }
  private completeIfReady(room: Room) {
    if (room.paused || !["writing", "prepare", "voting"].includes(room.phase)) return;
    const rows = this.progress(room);
    if (rows.length && rows.every((p) => p.completed === p.total)) this.next(room);
  }
  skipPlayer(code: string, hostId: string, playerId: string) {
    const room = this.getRoom(code);
    this.host(room, hostId);
    check(!room.paused, "Reprenez la partie avant de passer un joueur.");
    check(room.round && !["lobby", "podium"].includes(room.phase), "Aucune participation à passer.");
    check(room.round.participantIds.includes(playerId), "Joueur inconnu dans cette manche.");
    if (!room.phaseExcludedIds.includes(playerId)) room.phaseExcludedIds.push(playerId);
    const speakerId = room.phase === "presenting" ? this.snapshot(room, hostId).round?.currentSpeakerId : undefined;
    if (speakerId === playerId) this.next(room);
    else this.completeIfReady(room);
    this.changed(room);
  }
  react(code: string, id: string, reaction: string) {
    const room = this.getRoom(code), player = this.getPlayer(room, id);
    check(player.connected, "Reconnectez-vous pour réagir.");
    check(room.config.reactionsEnabled, "Les réactions sont désactivées.");
    check((REACTIONS as readonly string[]).includes(reaction), "Réaction inconnue.");
    check(!(id in room.lastReactionAt) || this.now() - room.lastReactionAt[id]! >= 2000, "Patientez deux secondes entre deux réactions.");
    room.lastReactionAt[id] = this.now();
    room.reactions = [...room.reactions.filter((r) => this.now() - r.createdAt < REACTION_TTL),
      { id: randomUUID(), playerId: id, reaction, createdAt: this.now() }].slice(-24);
    this.changed(room);
  }
  action(code: string, id: string, input: Action) {
    const room = this.getRoom(code),
      player = this.getPlayer(room, id),
      action = actionSchema.parse(input),
      round = room.round;
    check(!room.paused, "La partie est en pause.");
    check(
      round && round.participantIds.includes(id) && !player.spectator && player.connected,
      "Vous pourrez participer à la prochaine manche.",
    );
    check(this.eligible(room).includes(id), "Votre tour a été passé. Vous pourrez revenir à la prochaine étape.");
    check(
      room.deadline === null || this.now() < room.deadline,
      "Le temps est écoulé.",
    );
    if (action.type === "prepared") {
      check(room.phase === "prepare" && ["pitch", "court", "captions"].includes(round.gameId), "La préparation n’est pas ouverte.");
      check(!round.prepared.includes(id), "Vous êtes déjà prêt.");
      round.prepared.push(id);
    } else if (action.type === "caption") {
      check(room.phase === "writing" && round.captions, "Ce n’est pas le moment d’écrire une réplique.");
      const cinema = round.captions, story = this.captionAssignment(round, id)!;
      check(!round.submitted.includes(id) && !story.lines.some((line) => line.frameIndex === cinema.turn), "Votre réplique a déjà été validée.");
      story.lines.push({ id: randomUUID(), text: cleanText(action.text), frameIndex: cinema.turn, authorId: id });
      round.submitted.push(id);
    } else if (action.type === "answer") {
      check(
        (room.phase === "writing" &&
          round.gameId === "mythos") ||
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
      if (room.phase === "prepare" && !round.prepared.includes(id)) round.prepared.push(id);
    } else if (action.type === "product") {
      check(
        room.phase === "writing" && round.gameId === "pitch",
        "Ce n’est pas le moment d’inventer un produit.",
      );
      check(
        !round.submitted.includes(id),
        "Votre invention a déjà été envoyée.",
      );
      if (action.suggestionToken) check(round.suggestions?.[id]?.token === action.suggestionToken, "Cette idée a expiré. Demandez une nouvelle proposition.");
      round.products.push({
        name: cleanText(action.name),
        description: cleanText(action.description),
        creatorId: id,
        generated: !!action.suggestionToken,
      });
      round.submitted.push(id);
    } else {
      check(room.phase === "voting", "Le vote n’est pas ouvert.");
      if (action.type === "cinema-vote") {
        check(round.captions, "Ce vote appartient à la cérémonie du cinéma.");
        check(this.captionVoteTargets(round, id)[action.award].includes(action.targetId), "Choisissez une proposition éligible d’un autre participant.");
        round.captions.awardVotes[id] ??= {};
        check(room.config.allowVoteChange || !round.captions.awardVotes[id]![action.award], "Ce prix a déjà reçu votre vote.");
        round.captions.awardVotes[id]![action.award] = action.targetId;
      } else if (action.type === "rate") {
        check(
          round.gameId === "pitch",
          "Cette note est réservée aux présentations.",
        );
        check(
          action.targetId !== id,
          "On ne peut pas noter sa propre présentation.",
        );
        check(
          this.rateTargets(room, id).some((p) => p.sellerId === action.targetId),
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
    if (round.missions[id] && (action.type === "answer" || action.type === "product")) {
      const text = action.type === "answer" ? action.text : `${action.name} ${action.description}`;
      round.missions[id]!.completed = (cleanText(text).toLocaleLowerCase("fr").match(/\p{L}+/gu) || []).some((word) => word === round.missions[id]!.word);
    }
    this.completeIfReady(room);
    this.changed(room);
  }
  private score(room: Room) {
    const round = room.round!;
    if (round.scored) return;
    let results: RoundResult[] = [];
    if (round.captions) {
      const cinema = round.captions;
      const categoryVotes = (award: "film" | "actor" | "line") => Object.fromEntries(
        Object.entries(cinema.awardVotes).flatMap(([voter, ballots]) => ballots[award] ? [[voter, ballots[award]!]] : []),
      );
      const film = topTargets(categoryVotes("film")), actor = topTargets(categoryVotes("actor")), line = topTargets(categoryVotes("line"));
      cinema.awards = { filmIds: film.winners, actorIds: actor.winners, lineIds: line.winners,
        counts: { film: film.counts, actor: actor.counts, line: line.counts } };
      // A film is a collective distinction. Individual prizes have a fixed ceiling independent of group size.
      for (const playerId of actor.winners) results.push({ playerId, points: 300, votes: actor.counts[playerId], reason: "Prix du meilleur acteur" });
      const authors = new Set(cinema.stories.flatMap((story) => story.lines.filter((entry) => line.winners.includes(entry.id) && entry.authorId).map((entry) => entry.authorId)));
      for (const playerId of authors) results.push({ playerId, points: 250, reason: "Prix de la meilleure réplique" });
      round.voteCounts = film.counts;
    } else if (round.gameId === "mythos" || round.gameId === "captions") {
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
      room.config.balanced && (round.gameId === "mythos" || (round.gameId === "captions" && !round.captions))
        ? Math.min(1, 4 / Math.max(1, round.participantIds.length - 1))
        : 1;
    round.results = results.map((r) => ({
      ...r,
      points: room.config.noPoints ? 0 : Math.round(
        r.points * balance * room.config.coefficients[round.gameId],
      ),
    }));
    // The optional personal challenge grants the advertised fixed bonus, independently of game normalization.
    for (const [playerId, mission] of Object.entries(round.missions))
      if (mission.completed) round.results.push({
        playerId, points: room.config.noPoints ? 0 : 50, reason: "Mission secrète : mot imposé placé",
      });
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
    room.usedDecoyIds = [];
    room.usedCinemaIds = [];
    room.paused = false;
    room.deadline = null;
    this.setPhase(room, "lobby", null);
    room.reactions = [];
    room.lastReactionAt = {};
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
      room.phase === "leaderboard" ||
      room.phase === "transition" ||
      room.phase === "podium";
    const revealProductOrigin = reveal && round?.scored;
    const scoresVisible =
      room.phase === "lobby" ||
      room.phase === "podium" ||
      room.phase === "leaderboard" ||
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
      const bestGame = Object.entries(totals).filter(([, points]) => points > 0).sort(
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
        history: scoresVisible ? structuredClone(p.history) : [],
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
      ...(revealProductOrigin && p.creatorId ? { creatorId: p.creatorId } : {}),
      ...(revealProductOrigin && p.generated !== undefined ? { generated: p.generated } : {}),
    });
    const phaseAllowsAnswers =
      round?.gameId !== "court" && !round?.captions && (room.phase === "reveal" || room.phase === "voting" || reveal);
    const currentProduct =
      round?.gameId === "pitch" && ["presenting", "voting", "results"].includes(room.phase)
        ? round.products[round.presentationIndex]
        : undefined;
    let currentSpeakerId = currentProduct?.sellerId;
    const cinema = round?.captions;
    if (cinema && room.phase === "presenting") currentSpeakerId = cinema.stories[round!.presentationIndex]?.presenterId;
    const assignedStory = round && cinema ? this.captionAssignment(round, id) : undefined;
    const ownLine = assignedStory?.lines.find((line) => line.frameIndex === cinema!.turn && line.authorId === id);
    const currentNotes = currentProduct?.sellerId && round ? Object.values(round.ratings).map((ratings) => ratings[currentProduct.sellerId!]).filter((note): note is [number, number, number] => !!note) : [];
    const currentAverage = currentNotes.length ? currentNotes.reduce((sum, notes) => sum + (notes[0] + notes[1] + notes[2]) / 3, 0) / currentNotes.length : 0;
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
      phaseStartedAt: room.phaseStartedAt,
      progress: this.progress(room),
      manualAdvanceRequired: this.manualAdvanceRequired(room),
      awaitingHost: this.manualAdvanceRequired(room) && !room.paused &&
        (room.deadline === null || this.now() >= room.deadline),
      reactions: room.config.reactionsEnabled ? structuredClone(room.reactions.filter((r) => this.now() - r.createdAt < REACTION_TTL)) : [],
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
                ? (round.scored ? round.products : currentProduct ? [currentProduct] : []).map(publicProduct)
                : undefined,
            currentProduct: currentProduct
              ? publicProduct(currentProduct)
              : undefined,
            currentSpeakerId,
            presentationIndex: round.presentationIndex,
            courtStep: round.courtStep,
            roles: round.roles ? structuredClone(round.roles) : undefined,
            submittedCount: this.eligible(room).filter((p) => round.submitted.includes(p)).length,
            eligibleCount: this.progress(room)[0]?.total ?? this.eligible(room).length,
            votedCount: room.phase === "voting" ? this.progress(room)[0]?.completed || 0 : 0,
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
            pitchFinalResults: round.gameId === "pitch" ? round.scored : undefined,
            pitchRating: round.gameId === "pitch" && room.phase === "results" && currentProduct?.sellerId ? {
              sellerId: currentProduct.sellerId, average: Math.round(currentAverage * 10) / 10, ratingsCount: currentNotes.length,
            } : undefined,
          }
        : undefined,
      me: {
        id,
        eligible: this.eligible(room).includes(id) &&
          (room.phase !== "voting" || this.voters(room).includes(id)),
        submitted: round?.submitted.includes(id) || false,
        prepared: round?.prepared.includes(id) || false,
        voted: round ? this.voted(room, id) : false,
        answer: ownAnswer?.text,
        answerId: ownAnswer?.id,
        product: ownProduct ? publicProduct(ownProduct) : undefined,
        vote: round?.votes[id] || round?.bestVotes[id],
        ratings: round?.ratings[id]
          ? structuredClone(round.ratings[id])
          : undefined,
        courtRole,
        secretMission: round?.missions[id] ? {
          word: round.missions[id]!.word,
          instruction: room.config.noPoints
            ? `Glissez le mot « ${round.missions[id]!.word} » dans votre création. Défi personnel, sans points.`
            : `Glissez le mot « ${round.missions[id]!.word} » dans votre création pour gagner 50 points bonus.`,
          completed: round.missions[id]!.completed,
        } : undefined,
        productSuggestion: round?.gameId === "pitch" && room.phase === "writing" && round.suggestions?.[id]
          ? structuredClone(round.suggestions[id]) : undefined,
        captions: cinema ? {
          storyId: room.phase === "writing" ? assignedStory?.id : undefined,
          turn: cinema.turn, totalTurns: cinema.turns,
          frame: room.phase === "writing" && assignedStory ? structuredClone(assignedStory.scene.frames[cinema.turn]) : undefined,
          previousLines: room.phase === "writing" && assignedStory
            ? assignedStory.lines.filter((line) => line.frameIndex < cinema.turn).map(({ id: lineId, text, frameIndex }) => ({ id: lineId, text, frameIndex })) : [],
          submitted: round!.submitted.includes(id), ownText: room.phase === "writing" ? ownLine?.text : undefined,
          presentation: ["prepare", "presenting", "voting", "results", "leaderboard", "transition", "podium"].includes(room.phase)
            ? (() => { const story = cinema.stories.find((story) => story.presenterId === id); return story ? this.captionStoryView(story, reveal) : undefined; })() : undefined,
          votes: structuredClone(cinema.awardVotes[id] || {}),
          eligibleTargets: room.phase === "voting" ? this.captionVoteTargets(round!, id) : { film: [], actor: [], line: [] },
        } : undefined,
      },
      deadline: room.deadline,
      paused: room.paused,
      pausedAt: room.pausedAt,
      serverTime: this.now(),
      inviteUrl: `${this.publicUrl}/?room=${room.code}`,
      message: room.message,
      scoresVisible,
      gameSummary,
      captions: cinema ? {
        writingTurn: cinema.turn + 1, writingTurns: cinema.turns, storyCount: cinema.stories.length,
        presentationIndex: round!.presentationIndex, slideIndex: cinema.slideIndex,
        autoSlides: cinema.autoSlides, slideSeconds: room.config.captionSlideSeconds, slideStartedAt: cinema.slideStartedAt,
        currentStory: room.phase === "presenting" ? this.captionStoryView(cinema.stories[round!.presentationIndex]!, false) : undefined,
        stories: ["voting", "results", "leaderboard", "transition", "podium"].includes(room.phase)
          ? cinema.stories.map((story) => this.captionStoryView(story, reveal)) : undefined,
        awards: reveal && cinema.awards ? structuredClone(cinema.awards) : undefined,
      } : undefined,
    };
  }
  async updateContent(content: ContentItem[]) {
    await this.options.store.saveContent(content);
    this.content = structuredClone(content);
  }
  async updateCinema(scenes: CinemaScene[]) {
    await this.options.store.saveCinema(scenes);
    this.cinema = structuredClone(scenes);
  }
  async updateDecoys(products: DecoyProduct[]) {
    await this.options.store.saveDecoys(products);
    this.decoys = structuredClone(products);
  }
}
