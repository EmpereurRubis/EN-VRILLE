import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import type { ContentItem } from "@en-vrille/content";
import type { Room } from "./model.js";

export interface PersistedState {
  rooms: Room[];
  content: ContentItem[] | null;
}
export interface Store {
  load(): Promise<PersistedState>;
  saveRoom(room: Room): Promise<void>;
  deleteRoom(code: string): Promise<void>;
  saveContent(content: ContentItem[]): Promise<void>;
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
    this.pending = this.pending.then(async () => {
      await writeFile(resolve(this.directory, "state.tmp"), snapshot, {
        mode: 0o600,
      });
      await rename(
        resolve(this.directory, "state.tmp"),
        resolve(this.directory, "state.json"),
      );
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
      this.pool.query<{ value: ContentItem[] }>(
        "SELECT value FROM vrille_settings WHERE key = $1",
        ["content"],
      ),
    ]);
    return {
      rooms: rooms.rows.map((r) => r.state),
      content: settings.rows[0]?.value ?? null,
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
