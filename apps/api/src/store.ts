import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import type { ContentItem } from "@en-vrille/content";
import type { CinemaScene, DecoyProduct } from "@en-vrille/shared";
import type { Room } from "./model.js";

export interface PersistedState {
  rooms: Room[];
  content: ContentItem[] | null;
  cinema?: CinemaScene[] | null;
  decoys?: DecoyProduct[] | null;
}
export interface Store {
  load(): Promise<PersistedState>;
  saveRoom(room: Room): Promise<void>;
  deleteRoom(code: string): Promise<void>;
  saveContent(content: ContentItem[]): Promise<void>;
  saveCinema(cinema: CinemaScene[]): Promise<void>;
  saveDecoys(decoys: DecoyProduct[]): Promise<void>;
  close(): Promise<void>;
  health?(): Promise<void>;
  kind: string;
}
export class MemoryStore implements Store {
  kind = "memory";
  protected state: PersistedState = { rooms: [], content: null };
  async load() {
    return structuredClone(this.state);
  }
  async saveRoom(room: Room) {
    this.state.rooms = [
      ...this.state.rooms.filter((r) => r.code !== room.code),
      structuredClone(room),
    ];
  }
  async deleteRoom(code: string) {
    this.state.rooms = this.state.rooms.filter((r) => r.code !== code);
  }
  async saveContent(content: ContentItem[]) {
    this.state.content = structuredClone(content);
  }
  async saveCinema(cinema: CinemaScene[]) {
    this.state.cinema = structuredClone(cinema);
  }
  async saveDecoys(decoys: DecoyProduct[]) {
    this.state.decoys = structuredClone(decoys);
  }
  async close() {}
}
export class FileStore extends MemoryStore {
  override kind = "file";
  private pending: Promise<void> = Promise.resolve();
  constructor(private directory: string) {
    super();
  }
  override async load() {
    await mkdir(this.directory, { recursive: true });
    try {
      this.state = JSON.parse(
        await readFile(resolve(this.directory, "state.json"), "utf8"),
      ) as PersistedState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return super.load();
  }
  private persist() {
    const snapshot = JSON.stringify(this.state);
    this.pending = this.pending
      .catch(() => {})
      .then(async () => {
        const temporary = resolve(this.directory, "state.tmp");
        const destination = resolve(this.directory, "state.json");
        await writeFile(temporary, snapshot, { mode: 0o600 });
        // Windows antivirus/indexing can briefly lock the destination. Keep the
        // previous snapshot intact and retry the atomic replacement, never unlink it.
        for (let attempt = 0; attempt < 8; attempt++) {
          try {
            await rename(temporary, destination);
            return;
          } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (
              attempt === 7 ||
              !["EPERM", "EACCES", "EBUSY"].includes(code || "")
            )
              throw error;
            await new Promise<void>((done) =>
              setTimeout(done, Math.min(200, 25 * 2 ** attempt)),
            );
          }
        }
      });
    return this.pending;
  }
  override async saveRoom(room: Room) {
    await super.saveRoom(room);
    return this.persist();
  }
  override async deleteRoom(code: string) {
    await super.deleteRoom(code);
    return this.persist();
  }
  override async saveContent(content: ContentItem[]) {
    await super.saveContent(content);
    return this.persist();
  }
  override async saveCinema(cinema: CinemaScene[]) {
    await super.saveCinema(cinema);
    return this.persist();
  }
  override async saveDecoys(decoys: DecoyProduct[]) {
    await super.saveDecoys(decoys);
    return this.persist();
  }
  override async close() {
    await this.pending;
  }
}

/** Re-runnable migration. Rooms include session hashes, round inputs and score history in JSONB. */
export const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS vrille_rooms (
  code text PRIMARY KEY, state jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vrille_rooms_updated ON vrille_rooms(updated_at);
CREATE TABLE IF NOT EXISTS vrille_settings (
  key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS vrille_migrations (
  version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO vrille_migrations(version) VALUES (1) ON CONFLICT DO NOTHING;
`;
export class PostgresStore implements Store {
  kind = "postgres";
  private pool: pg.Pool;
  private pending = new Set<Promise<unknown>>();
  constructor(connectionString?: string) {
    this.pool = new pg.Pool({
      ...(connectionString ? { connectionString } : {}),
      connectionTimeoutMillis: 3000,
      query_timeout: 3000,
      max: 5,
    });
    // Idle pool errors must not become unhandled EventEmitter errors during a DB restart.
    this.pool.on("error", (error) =>
      console.error("Connexion PostgreSQL interrompue :", error.message),
    );
  }
  async health() {
    await this.pool.query("SELECT 1");
  }
  async load() {
    await this.pool.query(MIGRATION_SQL);
    const [rooms, settings] = await Promise.all([
      this.pool.query<{ state: Room }>(
        "SELECT state FROM vrille_rooms WHERE updated_at > now() - interval '7 days'",
      ),
      this.pool.query<{ key: string; value: unknown }>(
        "SELECT key,value FROM vrille_settings WHERE key = ANY($1::text[])",
        [["content", "cinema", "decoys"]],
      ),
    ]);
    return {
      rooms: rooms.rows.map((r) => r.state),
      content: (settings.rows.find((s) => s.key === "content")?.value ?? null) as ContentItem[] | null,
      cinema: (settings.rows.find((s) => s.key === "cinema")?.value ?? null) as CinemaScene[] | null,
      decoys: (settings.rows.find((s) => s.key === "decoys")?.value ?? null) as DecoyProduct[] | null,
    };
  }
  private track<T>(operation: Promise<T>) {
    this.pending.add(operation);
    operation.finally(() => this.pending.delete(operation)).catch(() => {});
    return operation;
  }
  async saveRoom(room: Room) {
    await this.track(
      this.pool.query(
        "INSERT INTO vrille_rooms(code, state) VALUES ($1,$2::jsonb) ON CONFLICT(code) DO UPDATE SET state=EXCLUDED.state,updated_at=now()",
        [room.code, JSON.stringify(room)],
      ),
    );
  }
  async deleteRoom(code: string) {
    await this.track(
      this.pool.query("DELETE FROM vrille_rooms WHERE code=$1", [code]),
    );
  }
  async saveContent(content: ContentItem[]) {
    await this.track(
      this.pool.query(
        "INSERT INTO vrille_settings(key,value) VALUES ($1,$2::jsonb) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()",
        ["content", JSON.stringify(content)],
      ),
    );
  }
  private async saveSetting(key: string, value: unknown) {
    await this.track(this.pool.query(
      "INSERT INTO vrille_settings(key,value) VALUES ($1,$2::jsonb) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()",
      [key, JSON.stringify(value)],
    ));
  }
  async saveCinema(cinema: CinemaScene[]) { await this.saveSetting("cinema", cinema); }
  async saveDecoys(decoys: DecoyProduct[]) { await this.saveSetting("decoys", decoys); }
  async close() {
    await Promise.all(this.pending);
    await this.pool.end();
  }
}
export function defaultStore() {
  if (process.env.DATABASE_URL || process.env.PGHOST)
    return new PostgresStore(process.env.DATABASE_URL);
  if (process.env.NODE_ENV === "production")
    throw new Error(
      "PostgreSQL obligatoire en production : renseigner DATABASE_URL ou PGHOST.",
    );
  return new FileStore(process.env.DATA_DIR || resolve(process.cwd(), ".data"));
}
