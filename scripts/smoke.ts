import { io, type Socket } from "socket.io-client";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import {
  AVATARS,
  DEFAULT_CONFIG,
  type Ack,
  type ClientEvents,
  type RoomSnapshot,
  type ServerEvents,
  type Session,
} from "@en-vrille/shared";

const address = process.argv[2] || "http://localhost:3001";
type Client = {
  socket: Socket<ServerEvents, ClientEvents>;
  room?: RoomSnapshot;
  session?: Session;
};
const clients: Client[] = [];
async function waitFor(
  check: () => boolean | Promise<boolean>,
  message: string,
) {
  const until = Date.now() + 30000;
  do {
    if (await check()) return;
    await delay(100);
  } while (Date.now() < until);
  throw new Error(message);
}
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function connect() {
  const socket: Client["socket"] = io(address, {
    transports: ["websocket"],
    reconnection: false,
    timeout: 10000,
  });
  const client: Client = { socket };
  clients.push(client);
  socket.on("room:state", (room) => {
    client.room = room;
  });
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
  return client;
}
async function send(
  client: Client,
  event: keyof ClientEvents,
  payload: unknown = {},
) {
  const ack = await new Promise<Ack>((resolve, reject) => {
    (
      client.socket.timeout(12000).emit as unknown as (
        event: string,
        payload: unknown,
        cb: (err: Error | null, data: Ack) => void,
      ) => void
    )(event, payload, (err, data) => (err ? reject(err) : resolve(data)));
  });
  assert(ack.ok, `${event}: ${ack.error}`);
  if (ack.room) client.room = ack.room;
  if (ack.session) client.session = ack.session;
  return ack;
}
try {
  const health = await fetch(`${address}/api/health`);
  assert(health.ok, `Contrôle de santé HTTP ${health.status}`);
  if (process.env.SMOKE_PRODUCTION === "1") {
    const state = (await health.json()) as { storage: string };
    assert(state.storage === "postgres", "La stack doit utiliser PostgreSQL.");
    const frontend = await fetch(address);
    const html = await frontend.text();
    assert(
      frontend.ok && html.includes('id="root"'),
      "Le frontend compilé ne se charge pas.",
    );
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(
      (match) => match[1],
    );
    assert(assets.length >= 2, "Les assets React de production sont absents.");
    for (const asset of assets)
      assert(
        (await fetch(`${address}${asset}`)).ok,
        `Asset indisponible : ${asset}`,
      );
  }
  const host = await connect();
  await send(host, "room:create", { name: "Test Hôte", avatar: AVATARS[0] });
  assert(host.session, "Session hôte manquante.");
  for (let index = 1; index < 5; index++) {
    const player = await connect();
    await send(player, "room:join", {
      code: host.session.code,
      name: `Test Joueur ${index}`,
      avatar: AVATARS[index],
    });
    await send(player, "room:ready", { ready: true });
  }
  await send(host, "room:configure", {
    ...DEFAULT_CONFIG,
    allowVoteChange: true,
    balanced: false,
    playlist: [
      { gameId: "mythos", rounds: 1 },
      { gameId: "pitch", rounds: 1, pitchMode: "invented" },
      { gameId: "pitch", rounds: 1, pitchMode: "random" },
      { gameId: "court", rounds: 1 },
      { gameId: "who", rounds: 1 },
      { gameId: "captions", rounds: 1 },
    ],
  });
  await send(host, "room:start");
  const completed = new Set<string>();
  for (let guard = 0; guard < 120; guard++) {
    const room = host.room!;
    assert(!room.paused, room.message);
    if (room.phase === "podium") break;
    if (room.phase === "writing") {
      if (room.round?.gameId === "captions") {
        const media = await fetch(`${address}${room.round.mediaUrl}`);
        assert(
          media.ok && media.headers.get("content-type")?.startsWith("image/"),
          "Le média de la manche ne se charge pas.",
        );
      }
      for (const [index, player] of clients.entries()) {
        if (room.round?.gameId === "pitch")
          await send(player, "room:action", {
            type: "product",
            name: `Produit ${index}`,
            description: "Un grille-pain qui organise des réunions.",
          });
        else
          await send(player, "room:action", {
            type: "answer",
            text: `Réponse originale du joueur ${index} : le grille-pain a tout organisé.`,
          });
      }
      await waitFor(
        () => host.room?.phase !== "writing",
        "Les réponses complètes n’ont pas fait avancer la manche.",
      );
    } else if (room.phase === "voting") {
      for (const [index, player] of clients.entries()) {
        const state = player.room!;
        if (state.round!.gameId === "pitch") {
          for (const product of state.round!.products || [])
            if (product.sellerId !== player.session!.playerId) {
              await send(player, "room:action", {
                type: "rate",
                targetId: product.sellerId,
                humor: 4,
                conviction: 5,
                creativity: 4,
              });
            }
        } else if (state.round!.gameId === "court") {
          if (state.round!.roles!.jurors.includes(player.session!.playerId))
            await send(player, "room:action", {
              type: "verdict",
              guilty: false,
              bestPlayerId: state.round!.roles!.defense,
            });
          else
            await send(player, "room:action", {
              type: "vote",
              targetId: clients[(index + 1) % clients.length].session!.playerId,
            });
        } else if (state.round!.gameId === "who")
          await send(player, "room:action", {
            type: "vote",
            targetId: clients[(index + 1) % clients.length].session!.playerId,
          });
        else {
          const answer = state.round!.answers.find(
            (answer) => answer.id !== state.me.answerId,
          );
          assert(answer, "Aucune réponse à voter.");
          assert(
            state.round!.answers.every((answer) => !answer.authorId),
            "Auteur révélé avant la clôture.",
          );
          await send(player, "room:action", {
            type: "vote",
            targetId: answer.id,
          });
        }
      }
      await send(host, "room:advance");
    } else {
      if (room.phase === "results")
        completed.add(`${room.gameIndex}:${room.round!.gameId}`);
      await send(host, "room:advance");
    }
  }
  assert(host.room!.phase === "podium", "Le podium n’a pas été atteint.");
  assert(
    completed.size === 6,
    "Les cinq jeux et les deux modes de vente doivent tous se terminer.",
  );
  assert(
    host.room!.players.some((player) => player.score > 0),
    "Aucun point distribué.",
  );
  const session = host.session!;
  const score = host.room!.players.find(
    (player) => player.id === session.playerId,
  )!.score;
  host.socket.disconnect();
  if (process.env.SMOKE_RESTART_API === "1") {
    await promisify(execFile)("docker", ["compose", "restart", "api"], {
      timeout: 60000,
    });
    await waitFor(async () => {
      try {
        return (
          await fetch(`${address}/api/ready`, {
            signal: AbortSignal.timeout(3000),
          })
        ).ok;
      } catch {
        return false;
      }
    }, "L’API n’a pas redémarré correctement.");
  }
  const resumed = await connect();
  await send(resumed, "room:resume", session);
  assert(
    resumed.room!.players.find((player) => player.id === session.playerId)!
      .score === score,
    "Score perdu à la reconnexion.",
  );
  console.log(
    `OK ${address} : 5 joueurs, 5 jeux, 2 modes de vente, votes, podium, reconnexion${process.env.SMOKE_RESTART_API === "1" ? " et persistance après redémarrage API" : ""}.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  for (const client of clients) client.socket.disconnect();
}
