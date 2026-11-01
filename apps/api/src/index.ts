import dotenv from "dotenv";
import { resolve } from "node:path";
import { createGameServer } from "./server.js";

dotenv.config({ path: resolve(process.cwd(), "../../.env") });
dotenv.config();
const server = await createGameServer();
const address = await server.listen();
console.log(`EN VRILLE — serveur prêt sur ${address} (${server.store.kind}).`);
let closing = false;
const shutdown = async () => {
  if (closing) return;
  closing = true;
  try {
    await server.close();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
