import express from "express";
import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import type { CinemaScene } from "@en-vrille/shared";
import type { GameEngine } from "./engine.js";

const execute = promisify(execFile);
const identifier = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const httpUrl = z.string().url().refine((value) => /^https?:\/\//i.test(value));
const rightsSchema = z.object({
  title: z.string().trim().min(2).max(200),
  sourceUrl: httpUrl.max(2000),
  license: z.string().trim().min(2).max(200),
  licenseUrl: httpUrl.max(2000),
  territories: z.array(z.string().trim().min(2).max(100)).min(1).max(30),
  credits: z.string().trim().min(10).max(3000),
  verifiedAt: z.iso.date(),
  commercialUse: z.literal(true),
}).strict();
const mediaUrl = z.string().regex(/^\/media\/(?:cinema|custom\/cinema)\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/);
const sceneSchema = z.object({
  id: identifier,
  title: z.string().trim().min(2).max(150),
  category: z.string().trim().min(2).max(60),
  sourceVideoUrl: z.string().min(2).max(2000),
  clipUrl: mediaUrl,
  frames: z.array(z.object({
    url: mediaUrl,
    timecodeMs: z.number().int().min(0).max(90_000),
    subtitlePosition: z.enum(["top", "bottom"]),
  }).strict()).min(2).max(12),
  width: z.number().int().min(64).max(3840),
  height: z.number().int().min(64).max(2160),
  rights: rightsSchema,
}).strict().refine((scene) => scene.frames.every((frame, index) => index === 0 || frame.timecodeMs > scene.frames[index - 1]!.timecodeMs), "Les timecodes doivent être croissants.");
const extractSchema = z.object({
  sourceId: z.string().uuid(),
  title: z.string().trim().min(2).max(150),
  category: z.string().trim().min(2).max(60),
  start: z.number().min(0).max(1800),
  end: z.number().min(0).max(1800),
  count: z.number().int().min(2).max(12),
  timecodes: z.array(z.number().min(0).max(90)).min(2).max(12).optional(),
  subtitlePosition: z.enum(["top", "bottom"]).default("bottom"),
  rights: rightsSchema,
}).strict();

async function inspectVideo(path: string, format?: string) {
  const { stdout } = await execute("ffprobe", ["-v", "error", "-protocol_whitelist", "file,pipe", ...(format ? ["-f", format] : []), "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", path], { windowsHide: true, timeout: 20_000, maxBuffer: 1024 * 1024 });
  const probe = JSON.parse(stdout) as { format?: { duration?: string }; streams?: { codec_type: string; width: number; height: number }[] };
  const stream = probe.streams?.find((item) => item.codec_type === "video");
  const duration = Number(probe.format?.duration);
  if (!stream || !Number.isFinite(duration) || duration <= 0 || duration > 1800 || stream.width > 7680 || stream.height > 4320) throw new Error("invalid-video");
  return { duration, width: stream.width, height: stream.height };
}

/** Registered after the server's authenticated /api/admin middleware. Original uploads remain private. */
export function registerCinemaAdmin(app: express.Express, { engine, uploadDirectory }: { engine: GameEngine; uploadDirectory: string }) {
  const originals = resolve(dirname(uploadDirectory), "cinema-originals");
  let extracting = false;
  let mutations: Promise<unknown> = Promise.resolve();
  const mutate = (operation: () => Promise<unknown>) => {
    const pending = mutations.catch(() => {}).then(operation);
    mutations = pending;
    return pending;
  };
  const route = (handler: (req: express.Request, res: express.Response) => Promise<unknown>) => async (req: express.Request, res: express.Response) => {
    try { await handler(req, res); }
    catch (error) {
      if (res.headersSent) return;
      if (error instanceof z.ZodError) { res.status(400).json({ error: "Champs invalides. Vérifiez les droits, les timecodes et les informations de la scène.", details: error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) }); return; }
      const missingBinary = error instanceof Error && (error as NodeJS.ErrnoException).code === "ENOENT" && "cmd" in error;
      res.status(missingBinary ? 503 : 400).json({ error: missingBinary ? "FFmpeg et FFprobe doivent être installés sur le serveur pour importer une vidéo." : "Impossible de traiter cette vidéo. Vérifiez son format, sa durée et les timecodes." });
    }
  };
  app.get("/api/admin/cinema", (_req, res) => res.json({ items: engine.cinema }));
  app.post("/api/admin/cinema", route(async (req, res) => {
    const scene = sceneSchema.parse(req.body);
    await mutate(async () => {
      if (engine.cinema.some((item) => item.id === scene.id)) { res.status(409).json({ error: "Cette scène existe déjà. Utilisez la modification." }); return; }
      await engine.updateCinema([...engine.cinema, scene]);
      res.status(201).json({ item: scene });
    });
  }));
  app.put("/api/admin/cinema/:id", route(async (req, res) => {
    const id = identifier.parse(req.params.id);
    const scene = sceneSchema.parse(req.body);
    await mutate(async () => {
      if (scene.id !== id || !engine.cinema.some((item) => item.id === id)) { res.status(404).json({ error: "Scène introuvable." }); return; }
      await engine.updateCinema(engine.cinema.map((item) => item.id === id ? scene : item));
      res.json({ item: scene });
    });
  }));
  app.delete("/api/admin/cinema/:id", route(async (req, res) => {
    const id = identifier.parse(req.params.id);
    await mutate(async () => {
      if (!engine.cinema.some((item) => item.id === id)) { res.status(404).json({ error: "Scène introuvable." }); return; }
      await engine.updateCinema(engine.cinema.filter((item) => item.id !== id));
      res.json({ ok: true });
    });
  }));
  app.post("/api/admin/cinema/video", express.raw({ type: "application/octet-stream", limit: "250mb" }), route(async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length < 16) { res.status(400).json({ error: "Envoyez une vidéo MP4 ou WebM en application/octet-stream (250 Mo maximum)." }); return; }
    const bytes: Buffer = req.body;
    const format = bytes.subarray(4, 8).toString() === "ftyp" ? "mov" : bytes.readUInt32BE(0) === 0x1a45dfa3 ? "matroska" : undefined;
    if (!format) { res.status(415).json({ error: "Seuls les fichiers MP4 et WebM sont acceptés." }); return; }
    const sourceId = randomUUID();
    await mkdir(originals, { recursive: true });
    const path = resolve(originals, `${sourceId}.video`);
    await writeFile(path, bytes, { flag: "wx" });
    const info = await inspectVideo(path, format);
    await writeFile(resolve(originals, `${sourceId}.json`), JSON.stringify({ ...info, format, checksum: createHash("sha256").update(bytes).digest("hex") }));
    res.status(201).json({ sourceId, ...info });
  }));
  app.post("/api/admin/cinema/extract", route(async (req, res) => {
    const input = extractSchema.parse(req.body);
    if (extracting) { res.status(409).json({ error: "Une extraction est déjà en cours. Réessayez après sa fin." }); return; }
    const source = JSON.parse(await readFile(resolve(originals, `${input.sourceId}.json`), "utf8")) as { duration: number; format: string; checksum: string };
    const duration = input.end - input.start;
    const timecodes = input.timecodes ?? Array.from({ length: input.count }, (_, index) => Number((index * duration / input.count).toFixed(3)));
    if (duration < 1 || duration > 90 || input.end > source.duration || timecodes.length !== input.count || timecodes.some((time, index) => time >= duration || (index > 0 && time <= timecodes[index - 1]!))) { res.status(400).json({ error: "Choisissez un extrait de 1 à 90 secondes et des timecodes croissants à l'intérieur de cet extrait." }); return; }
    extracting = true;
    try {
      const hash = createHash("sha256").update(JSON.stringify({ source: source.checksum, start: input.start, duration, timecodes, version: 1 })).digest("hex").slice(0, 24);
      const id = `import-${hash}`;
      const destination = resolve(uploadDirectory, "cinema", id);
      await mkdir(destination, { recursive: true });
      const clip = resolve(destination, "clip.mp4");
      let cached: { width: number; height: number; frames: string[] } | undefined;
      try { cached = JSON.parse(await readFile(resolve(originals, `${hash}-cache.json`), "utf8")); } catch { /* First extraction. */ }
      if (!cached) {
        await execute("ffmpeg", ["-y", "-v", "error", "-protocol_whitelist", "file,pipe", "-f", source.format, "-ss", String(input.start), "-i", resolve(originals, `${input.sourceId}.video`), "-t", String(duration), "-an", "-vf", "scale=960:-2", "-r", "24", "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-threads", "2", "-movflags", "+faststart", clip], { windowsHide: true, timeout: 120_000, maxBuffer: 1024 * 1024 });
        const dimensions = await inspectVideo(clip);
        const frames: string[] = [];
        for (const time of timecodes) {
          const filename = `${randomUUID()}.jpg`;
          await execute("ffmpeg", ["-y", "-v", "error", "-ss", String(time), "-i", clip, "-frames:v", "1", "-q:v", "3", "-threads", "2", resolve(destination, filename)], { windowsHide: true, timeout: 20_000, maxBuffer: 1024 * 1024 });
          frames.push(filename);
        }
        cached = { width: dimensions.width, height: dimensions.height, frames };
        await writeFile(resolve(originals, `${hash}-cache.json`), JSON.stringify(cached));
      }
      const scene: CinemaScene = { id, title: input.title, category: input.category, sourceVideoUrl: `local-import:${input.sourceId}`, clipUrl: `/media/custom/cinema/${id}/clip.mp4`, width: cached.width, height: cached.height, rights: input.rights, frames: cached.frames.map((filename, index) => ({ url: `/media/custom/cinema/${id}/${filename}`, timecodeMs: Math.round(timecodes[index]! * 1000), subtitlePosition: input.subtitlePosition })) };
      res.json({ item: scene, cached: true });
    } finally { extracting = false; }
  }));
}
