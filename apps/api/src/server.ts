import express from "express";
import { createServer } from "node:http";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Server, type Socket } from "socket.io";
import { z } from "zod";
import { GAMES, AVATARS, PROTOCOL_VERSION } from "@en-vrille/shared";
import type { Ack, Session, ClientKind } from "@en-vrille/shared";
import type { ContentItem } from "@en-vrille/content";
import { GameEngine, type EngineOptions } from "./engine.js";
import { defaultStore, type Store } from "./store.js";
import { actionSchema, cleanText, configSchema, gameSchema } from "./rules.js";
import { registerCinemaAdmin } from "./cinema-admin.js";

export interface GameServerOptions {
  store?: Store;
  publicUrl?: string;
  adminToken?: string;
  mediaDirectory?: string;
  uploadDirectory?: string;
  autoTick?: boolean;
  now?: EngineOptions["now"];
  random?: EngineOptions["random"];
  sessionSecret?: string;
  logger?: (error: unknown) => void;
}
const profile = z
  .object({
    name: z.string().trim().min(2).max(22),
    avatar: z.enum(AVATARS as [string, ...string[]]),
  })
  .strict();
const sessionSchema = z
  .object({
    code: z.string().regex(/^[A-Z0-9]{6}$/i).transform((code) => code.toUpperCase()),
    clientId: z.string().uuid(),
    clientKind: z.enum(["DISPLAY_CLIENT", "PLAYER_CLIENT"]),
    token: z.string().min(40).max(100),
  })
  .strict();
const contentSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,100}$/)
      .optional(),
    gameId: gameSchema,
    category: z.string().trim().min(1).max(60),
    prompt: z.string().trim().min(3).max(500),
    promptEn: z.string().trim().min(3).max(500).optional(),
    adult: z.boolean().optional(),
    product: z
      .object({
        name: z.string().trim().min(1).max(70),
        description: z.string().trim().min(1).max(220),
        nameEn: z.string().trim().min(1).max(70).optional(),
        descriptionEn: z.string().trim().min(1).max(220).optional(),
      })
      .strict()
      .optional(),
    mediaUrl: z
      .string()
      .regex(
        /^\/media\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:svg|png|jpe?g|webp|gif|mp4|webm)$/,
      )
      .optional(),
  })
  .strict()
  .refine(
    (c) => c.gameId !== "pitch" || !!c.product,
    "Un produit doit avoir un nom et une description.",
  )
  .refine(
    (c) => c.gameId !== "captions" || !!c.mediaUrl,
    "Un sous-titre doit être associé à un média.",
  );
const digest = (value: string) => createHash("sha256").update(value).digest();
const decoySchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).optional(),
  name: z.string().trim().min(1).max(70), description: z.string().trim().min(1).max(220),
  category: z.string().trim().min(1).max(60), keywords: z.array(z.string().trim().min(1).max(40)).max(20),
  tagline: z.string().trim().max(120).optional(), nameEn: z.string().trim().min(1).max(70).optional(),
  descriptionEn: z.string().trim().min(1).max(220).optional(), taglineEn: z.string().trim().max(120).optional(),
}).strict();
class RateLimiter {
  private entries = new Map<string, { count: number; until: number }>();
  allow(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    let value = this.entries.get(key);
    if (!value || value.until < now) {
      value = { count: 0, until: now + windowMs };
      this.entries.set(key, value);
    }
    if (this.entries.size > 10_000)
      for (const [k, v] of this.entries)
        if (v.until < now) this.entries.delete(k);
    return ++value.count <= limit;
  }
}

export async function createGameServer(options: GameServerOptions = {}) {
  const store: Store = options.store || defaultStore(),
    logger = options.logger || console.error;
  const app = express(),
    httpServer = createServer(app),
    limiter = new RateLimiter();
  const publicUrl =
    options.publicUrl || process.env.PUBLIC_URL || "http://localhost:5173";
  const sessionSecret = options.sessionSecret || process.env.SESSION_SECRET;
  if (
    process.env.NODE_ENV === "production" &&
    (!sessionSecret || sessionSecret.length < 32)
  )
    throw new Error(
      "SESSION_SECRET doit contenir au moins 32 caractères en production.",
    );
  const allowedOrigins = new Set([
    new URL(publicUrl).origin,
    "app://game",
    ...(process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean),
  ]);
  const allowOrigin = (origin: string | undefined) =>
    !origin ||
    allowedOrigins.has(origin) ||
    (process.env.NODE_ENV !== "production" &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
  app.disable("x-powered-by");
  app.set("trust proxy", Number(process.env.TRUST_PROXY || 1));
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    next();
  });
  app.use((req, res, next) => {
    const origin = req.get("origin");
    if (!allowOrigin(origin)) {
      res.status(403).json({ error: "Origine non autorisée." });
      return;
    }
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use(express.json({ limit: "2mb" }));
  const io = new Server(httpServer, {
    maxHttpBufferSize: 16_384,
    connectTimeout: 15_000,
    pingTimeout: 20_000,
    pingInterval: 25_000,
    cors: {
      origin: (origin, callback) => callback(null, allowOrigin(origin)),
      methods: ["GET", "POST"],
    },
    allowRequest: (req, callback) =>
      callback(null, allowOrigin(req.headers.origin)),
  });
  io.use((socket, next) => {
    const version: unknown = socket.handshake.auth?.protocolVersion;
    // Missing negotiation belongs to the legacy version 1 client and cannot consume collaborative cinema.
    if (version === PROTOCOL_VERSION) return next();
    next(Object.assign(
      new Error("Cette version du jeu est incompatible avec le serveur. Mettez le jeu à jour puis reconnectez-vous."),
      { data: { code: "PROTOCOL_MISMATCH", supportedProtocol: PROTOCOL_VERSION } },
    ));
  });
  const engine = new GameEngine({
    store,
    publicUrl,
    now: options.now,
    random: options.random,
    sessionSecret,
    onError: logger,
  });
  await engine.initialize();
  const identities = new Map<string, { code: string; clientId: string; clientKind: ClientKind }>();
  const liveSessions = new Map<string, string>();
  const recoverySockets = new Map<string, string>();
  engine.onChange = (room) => {
    for (const [socketId, identity] of identities)
      if (identity.code === room.code)
        io.to(socketId).emit(
          "room:state",
          engine.snapshot(room, identity.clientId),
        );
  };
  const health = (_req: express.Request, res: express.Response) =>
    res.json({ ok: true, service: "en-vrille-api", storage: store.kind, protocolVersion: PROTOCOL_VERSION });
  app.get("/health", health);
  app.get("/api/health", health);
  app.get(["/ready", "/api/ready"], (_req, res) => {
    Promise.resolve()
      .then(() => store.health?.())
      .then(() =>
        res
          .status(engine.persistenceError ? 503 : 200)
          .json({ ok: !engine.persistenceError, storage: store.kind, protocolVersion: PROTOCOL_VERSION }),
      )
      .catch(() => res.status(503).json({ ok: false, storage: store.kind, protocolVersion: PROTOCOL_VERSION }));
  });
  app.use("/api", (req, res, next) => {
    if (!limiter.allow(`http:${req.ip}`, 240, 60_000)) {
      res
        .status(429)
        .json({ error: "Trop de requêtes. Patientez un instant." });
      return;
    }
    next();
  });
  app.get("/api/catalog", (_req, res) =>
    res.json({
      games: GAMES,
      categories: [...new Set([
        ...engine.content.filter((item) => item.gameId !== "captions").map((item) => item.category),
        ...engine.cinema.map((scene) => scene.category), ...engine.decoys.map((product) => product.category),
      ])].sort(),
      counts: Object.fromEntries(
        GAMES.map((g) => [
          g.id,
          g.id === "captions" ? engine.cinema.length : engine.content.filter((c) => c.gameId === g.id).length,
        ]),
      ),
      total: engine.content.filter((item) => item.gameId !== "captions").length + engine.cinema.length,
      decoyCount: engine.decoys.length,
    }),
  );
  app.get("/api/cinema/credits", (_req, res) => res.json({
    items: engine.cinema.map((scene) => ({ id: scene.id, title: scene.title, category: scene.category, rights: structuredClone(scene.rights) })),
  }));
  const mediaDirectory =
    options.mediaDirectory ||
    process.env.MEDIA_DIR ||
    resolve(process.cwd(), "../../packages/content/media");
  const uploadDirectory =
    options.uploadDirectory ||
    resolve(process.env.DATA_DIR || resolve(process.cwd(), ".data"), "media");
  await mkdir(uploadDirectory, { recursive: true });
  app.use(
    "/media/custom",
    express.static(uploadDirectory, {
      dotfiles: "deny",
      maxAge: "7d",
      immutable: true,
    }),
  );
  app.use(
    "/media",
    express.static(mediaDirectory, { dotfiles: "deny", maxAge: "7d" }),
  );
  app.use("/api/admin", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    const adminToken = options.adminToken ?? process.env.ADMIN_TOKEN;
    if (!adminToken) {
      res.status(503).json({
        error:
          "Administration désactivée. Configurez ADMIN_TOKEN sur le serveur.",
      });
      return;
    }
    if (!limiter.allow(`admin:${req.ip}`, 90, 60_000)) {
      res
        .status(429)
        .json({ error: "Trop de tentatives. Patientez une minute." });
      return;
    }
    const supplied = req.get("Authorization") || "";
    if (
      !supplied.startsWith("Bearer ") ||
      !timingSafeEqual(digest(supplied.slice(7)), digest(adminToken))
    ) {
      res.status(401).json({ error: "Jeton administrateur incorrect." });
      return;
    }
    next();
  });
  const asyncRoute =
    (
      handler: (
        req: express.Request,
        res: express.Response,
      ) => Promise<unknown>,
    ) =>
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      handler(req, res).catch(next);
    };
  let adminQueue: Promise<unknown> = Promise.resolve();
  const mutateContent = <T>(fn: () => Promise<T>): Promise<T> => {
    const operation = adminQueue.catch(() => {}).then(fn);
    adminQueue = operation;
    return operation;
  };
  registerCinemaAdmin(app, { engine, uploadDirectory });
  app.get("/api/admin/decoys", (_req, res) => res.json({ items: engine.decoys }));
  app.post("/api/admin/decoys", asyncRoute(async (req, res) => {
    const parsed = decoySchema.parse(req.body), item = { ...parsed, id: parsed.id || `decoy-${randomUUID()}` };
    await mutateContent(async () => {
      if (engine.decoys.some((product) => product.id === item.id)) throw new Error("Cet identifiant existe déjà.");
      await engine.updateDecoys([...engine.decoys, item]);
    });
    res.status(201).json({ item });
  }));
  app.put("/api/admin/decoys/:id", asyncRoute(async (req, res) => {
    const item = { ...decoySchema.parse({ ...req.body, id: req.params.id }), id: req.params.id };
    if (!engine.decoys.some((product) => product.id === item.id)) { res.status(404).json({ error: "Produit introuvable." }); return; }
    await mutateContent(() => engine.updateDecoys(engine.decoys.map((product) => product.id === item.id ? item : product)));
    res.json({ item });
  }));
  app.delete("/api/admin/decoys/:id", asyncRoute(async (req, res) => {
    if (!engine.decoys.some((product) => product.id === req.params.id)) { res.status(404).json({ error: "Produit introuvable." }); return; }
    await mutateContent(() => engine.updateDecoys(engine.decoys.filter((product) => product.id !== req.params.id)));
    res.json({ ok: true });
  }));
  app.get("/api/admin/content", (_req, res) =>
    res.json({
      items: engine.content,
      categories: [...new Set(engine.content.map((c) => c.category))].sort(),
    }),
  );
  app.post(
    "/api/admin/content",
    asyncRoute(async (req, res) => {
      const parsed = contentSchema.parse(req.body),
        item = {
          ...parsed,
          id: parsed.id || `custom-${randomUUID()}`,
          category: cleanText(parsed.category),
          prompt: cleanText(parsed.prompt),
        } as ContentItem;
      await mutateContent(async () => {
        if (engine.content.some((c) => c.id === item.id))
          throw new Error("Cet identifiant existe déjà.");
        await engine.updateContent([...engine.content, item]);
      });
      res.status(201).json({ item });
    }),
  );
  app.put(
    "/api/admin/content/:id",
    asyncRoute(async (req, res) => {
      const parsed = contentSchema.parse({ ...req.body, id: req.params.id }),
        item = {
          ...parsed,
          id: req.params.id,
          category: cleanText(parsed.category),
          prompt: cleanText(parsed.prompt),
        } as ContentItem;
      let found = false;
      await mutateContent(async () => {
        found = engine.content.some((c) => c.id === req.params.id);
        if (found)
          await engine.updateContent(
            engine.content.map((c) => (c.id === req.params.id ? item : c)),
          );
      });
      if (!found) {
        res.status(404).json({ error: "Contenu introuvable." });
        return;
      }
      res.json({ item });
    }),
  );
  app.delete(
    "/api/admin/content/:id",
    asyncRoute(async (req, res) => {
      let found = false;
      await mutateContent(async () => {
        found = engine.content.some((c) => c.id === req.params.id);
        if (found)
          await engine.updateContent(
            engine.content.filter((c) => c.id !== req.params.id),
          );
      });
      if (!found) {
        res.status(404).json({ error: "Contenu introuvable." });
        return;
      }
      res.json({ ok: true });
    }),
  );
  app.post(
    "/api/admin/media",
    asyncRoute(async (req, res) => {
      const { dataUrl } = z
        .object({ dataUrl: z.string().max(1_400_000) })
        .parse(req.body);
      const match =
        /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
          dataUrl,
        );
      if (!match) {
        res
          .status(400)
          .json({ error: "Utilisez une image PNG, JPEG, WebP ou GIF." });
        return;
      }
      const data = Buffer.from(match[2]!, "base64"),
        type = match[1]!;
      const valid =
        type === "png"
          ? data
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : type === "jpeg"
            ? data[0] === 255 && data[1] === 216 && data[2] === 255
            : type === "gif"
              ? /^GIF8[79]a$/.test(data.subarray(0, 6).toString())
              : data.subarray(0, 4).toString() === "RIFF" &&
                data.subarray(8, 12).toString() === "WEBP";
      if (!valid || data.length > 1_048_576) {
        res
          .status(400)
          .json({ error: "Image invalide ou trop grande (1 Mo maximum)." });
        return;
      }
      const filename = `${randomUUID()}.${type === "jpeg" ? "jpg" : type}`;
      await writeFile(resolve(uploadDirectory, filename), data, {
        flag: "wx",
        mode: 0o644,
      });
      res.status(201).json({ mediaUrl: `/media/custom/${filename}` });
    }),
  );
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: error.issues[0]?.message || "Données invalides." });
        return;
      }
      if (error instanceof SyntaxError) {
        res.status(400).json({ error: "Le corps JSON est invalide." });
        return;
      }
      if ((error as { status?: number })?.status === 413) {
        res
          .status(413)
          .json({ error: "Le fichier dépasse la taille autorisée." });
        return;
      }
      logger(error);
      res.status(400).json({
        error:
          error instanceof Error &&
          error.message === "Cet identifiant existe déjà."
            ? error.message
            : "Impossible d’enregistrer la modification.",
      });
    },
  );
  function identity(socket: Socket) {
    const found = identities.get(socket.id);
    if (!found) throw new Error("Rejoignez un salon pour continuer.");
    return found;
  }
  function attach(socket: Socket, session: Session) {
    const key = `${session.code}:${session.clientId}`,
      oldId = liveSessions.get(key);
    if (oldId && oldId !== socket.id) {
      const previous = io.sockets.sockets.get(oldId);
      identities.delete(oldId);
      previous?.emit(
        "server:error",
        "Votre session a été ouverte dans un autre onglet.",
      );
      previous?.disconnect(true);
    }
    liveSessions.set(key, socket.id);
    identities.set(socket.id, {
      code: session.code,
      clientId: session.clientId,
      clientKind: session.clientKind,
    });
  }
  io.on("connection", (socket) => {
    const address = socket.handshake.address;
    if (!limiter.allow(`connect:${address}`, 150, 60_000)) {
      socket.emit(
        "server:error",
        "Trop de connexions. Réessayez dans une minute.",
      );
      socket.disconnect(true);
      return;
    }
    function register(
      event: string,
      handler: (data: unknown) => Promise<Ack> | Ack,
    ) {
      socket.on(event, (data: unknown, ack?: (result: Ack) => void) => {
        if (!limiter.allow(`event:${socket.id}`, 70, 10_000)) {
          if (typeof ack === "function")
            ack({
              ok: false,
              error: "Un peu de calme ! Trop d’actions envoyées.",
            });
          return;
        }
        Promise.resolve()
          .then(() => handler(data))
          .then(async (result) => {
            await engine.flush();
            if (typeof ack === "function") {
              // Another action may advance the room while this save is pending.
              // Snapshot immediately before sending, so an ACK cannot roll a
              // client back behind a room:state already sent on this socket.
              if (result.room) {
                const current = identities.get(socket.id);
                result.room = current
                  ? engine.snapshot(
                      engine.getRoom(current.code),
                      current.clientId,
                    )
                  : undefined;
              }
              ack(result);
            }
          })
          .catch((error) => {
            const message =
              error instanceof z.ZodError
                ? "Données invalides. Vérifiez les champs envoyés."
                : error instanceof Error
                  ? error.message
                  : "Une erreur est survenue.";
            if (typeof ack === "function") ack({ ok: false, error: message });
            else socket.emit("server:error", message);
          });
      });
    }
    function noSession() {
      if (identities.has(socket.id))
        throw new Error(
          "Vous êtes déjà dans un salon. Quittez-le pour en rejoindre un autre.",
        );
    }
    const state = () => {
      const i = identity(socket);
      return {
        ok: true,
        room: engine.snapshot(engine.getRoom(i.code), i.clientId),
      };
    };
    register("room:create", (data) => {
      noSession();
      if (!limiter.allow(`create:${address}`, 15, 3600_000))
        throw new Error("Trop de salons créés. Réessayez plus tard.");
      z.object({}).strict().parse(data);
      const { room, session } = engine.create();
      attach(socket, session);
      return {
        ok: true,
        session,
        room: engine.snapshot(room, session.clientId),
      };
    });
    register("room:join", (data) => {
      noSession();
      const p = profile
        .extend({
          code: z
            .string()
            .trim()
            .regex(/^[a-z0-9]{6}$/i),
          spectator: z.boolean().optional(),
        })
        .parse(data);
      const { room, session } = engine.join(
        p.code,
        p.name,
        p.avatar,
        p.spectator,
      );
      attach(socket, session);
      return {
        ok: true,
        session,
        room: engine.snapshot(room, session.clientId),
      };
    });
    register("room:resume", (data) => {
      noSession();
      const session = sessionSchema.parse(data);
      const room = engine.resume(session);
      attach(socket, session);
      return {
        ok: true,
        session,
        room: engine.snapshot(room, session.clientId),
      };
    });
    register("room:claim-control", (data) => {
      const p = z.object({ pairingCode: z.string().regex(/^\d{6}$/) }).strict().parse(data), i = identity(socket);
      if (!limiter.allow(`pairing:${address}:${i.code}`, 10, 60_000)) throw new Error("Trop de tentatives d’association. Patientez une minute.");
      engine.claimControl(i.code, i.clientId, p.pairingCode);
      return state();
    });
    register("room:transfer-control", (data) => {
      const p = z.object({ playerId: z.string().uuid() }).strict().parse(data), i = identity(socket);
      engine.transferControl(i.code, i.clientId, p.playerId);
      return state();
    });
    register("room:recovery-request", (data) => {
      noSession();
      const p = z.object({ code: z.string().regex(/^[a-z0-9]{6}$/i), name: z.string().trim().min(2).max(22) }).strict().parse(data);
      if (!limiter.allow(`recovery:${address}`, 5, 60_000)) throw new Error("Trop de demandes. Patientez une minute.");
      for (const [requestId, targetSocketId] of recoverySockets) {
        const previous = engine.recoveryRequests.get(requestId);
        if (!previous || targetSocketId === socket.id) {
          engine.recoveryRequests.delete(requestId);
          recoverySockets.delete(requestId);
        }
      }
      const request = engine.requestRecovery(p.code, p.name);
      recoverySockets.set(request.requestId, socket.id);
      return { ok: true, recoveryRequestId: request.requestId };
    });
    register("room:approve-recovery", async (data) => {
      const p = z.object({ requestId: z.string().uuid() }).strict().parse(data), i = identity(socket);
      const targetId = recoverySockets.get(p.requestId), target = targetId ? io.sockets.sockets.get(targetId) : undefined;
      if (!target || identities.has(target.id)) throw new Error("Le nouvel appareil n’attend plus cette récupération.");
      const session = engine.approveRecovery(i.code, i.clientId, p.requestId);
      recoverySockets.delete(p.requestId);
      attach(target, session);
      await engine.flush();
      target.emit("room:recovered", { ok: true, session, room: engine.snapshot(engine.getRoom(session.code), session.clientId) });
      return state();
    });
    register("room:ready", (data) => {
      const p = z.object({ ready: z.boolean() }).strict().parse(data),
        i = identity(socket);
      engine.ready(i.code, i.clientId, p.ready);
      return state();
    });
    register("room:configure", (data) => {
      const config = configSchema.parse(data),
        i = identity(socket);
      engine.configure(i.code, i.clientId, config);
      return state();
    });
    register("room:start", () => {
      const i = identity(socket);
      engine.start(i.code, i.clientId);
      return state();
    });
    register("room:action", (data) => {
      const action = actionSchema.parse(data),
        i = identity(socket);
      engine.action(i.code, i.clientId, action);
      return state();
    });
    register("room:product-suggestion", (data) => {
      z.object({}).strict().parse(data);
      const i = identity(socket);
      engine.suggestProduct(i.code, i.clientId);
      return state();
    });
    register("room:caption-control", (data) => {
      const p = z.object({ direction: z.enum(["next", "previous"]).optional(), autoSlides: z.boolean().optional(), playback: z.enum(["play", "pause", "restart"]).optional(), mode: z.enum(["video", "slides"]).optional(), revision: z.string().uuid() }).strict()
        .refine((control) => control.direction !== undefined || control.autoSlides !== undefined || control.playback !== undefined || control.mode !== undefined).parse(data),
        i = identity(socket);
      engine.captionControl(i.code, i.clientId, p);
      return state();
    });
    register("room:react", (data) => {
      const p = z.object({ reaction: z.string().max(16) }).strict().parse(data),
        i = identity(socket);
      engine.react(i.code, i.clientId, p.reaction);
      return state();
    });
    register("room:skip-player", (data) => {
      const p = z.object({ playerId: z.string().uuid() }).strict().parse(data),
        i = identity(socket);
      engine.skipPlayer(i.code, i.clientId, p.playerId);
      return state();
    });
    register("room:advance", (data) => {
      const p = z.object({ transitionId: z.string().uuid(), skip: z.boolean().optional() }).strict().parse(data),
        i = identity(socket);
      engine.advance(i.code, i.clientId, p.transitionId, p.skip);
      return state();
    });
    register("room:reopen-collection", (data) => {
      const p = z.object({ transitionId: z.string().uuid(), seconds: z.number().int().min(0).max(900) }).strict().parse(data),
        i = identity(socket);
      engine.reopenCollection(i.code, i.clientId, p.transitionId, p.seconds);
      return state();
    });
    register("room:pause", (data) => {
      const p = z.object({ paused: z.boolean() }).strict().parse(data),
        i = identity(socket);
      engine.pause(i.code, i.clientId, p.paused);
      return state();
    });
    register("room:replay", () => {
      const i = identity(socket);
      engine.replay(i.code, i.clientId);
      return state();
    });
    register("room:leave", () => {
      const i = identity(socket);
      engine.leave(i.code, i.clientId);
      identities.delete(socket.id);
      liveSessions.delete(`${i.code}:${i.clientId}`);
      return { ok: true };
    });
    socket.on("disconnect", () => {
      for (const [requestId, targetId] of recoverySockets) if (targetId === socket.id) {
        engine.recoveryRequests.delete(requestId);
        recoverySockets.delete(requestId);
      }
      const i = identities.get(socket.id);
      if (!i) return;
      identities.delete(socket.id);
      const key = `${i.code}:${i.clientId}`;
      if (liveSessions.get(key) === socket.id) {
        liveSessions.delete(key);
        engine.disconnect(i.code, i.clientId);
      }
    });
  });
  const interval =
    options.autoTick === false
      ? undefined
      : setInterval(() => engine.tick(), 250);
  interval?.unref();
  return {
    app,
    httpServer,
    io,
    engine,
    store,
    async listen(
      port = Number(process.env.PORT || 3001),
      hostname = "0.0.0.0",
    ) {
      await new Promise<void>((resolveListen, reject) => {
        httpServer.once("error", reject);
        httpServer.listen(port, hostname, () => {
          httpServer.off("error", reject);
          resolveListen();
        });
      });
      const address = httpServer.address();
      return `http://${hostname === "0.0.0.0" ? "127.0.0.1" : hostname}:${typeof address === "object" && address ? address.port : port}`;
    },
    async close() {
      if (interval) clearInterval(interval);
      await new Promise<void>((done) => io.close(() => done()));
      await engine.flush();
      await store.close();
    },
  };
}
