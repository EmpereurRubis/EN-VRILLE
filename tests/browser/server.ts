import { resolve } from "node:path";
import { createGameServer } from "../../apps/api/src/server.ts";
import { MemoryStore } from "../../apps/api/src/store.ts";

const server = await createGameServer({ store: new MemoryStore(), publicUrl: "http://127.0.0.1:5173",
  mediaDirectory: resolve("packages/content/media"), uploadDirectory: resolve(".local/browser-media"),
  sessionSecret: "browser-test-secret-with-at-least-32-characters" });
await server.listen(3001, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, () => { void server.close().then(() => process.exit(0)); });
