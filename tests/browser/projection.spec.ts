import { expect, test } from "@playwright/test";
import { io, type Socket } from "socket.io-client";
import { AVATARS, DEFAULT_CONFIG, PROTOCOL_VERSION, type Ack, type Session } from "../../packages/shared/src/index.ts";

test("Cinéma 1080p : vidéo réelle, sous-titres timecodés et télécommande mobile", async ({ browser, page: stage }, testInfo) => {
  const sockets: Socket[] = [];
  async function connect() {
    const socket = io("http://127.0.0.1:3001", { autoConnect: false, reconnection: false, transports: ["websocket"], auth: { protocolVersion: PROTOCOL_VERSION } });
    sockets.push(socket);
    await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); socket.connect(); });
    return socket;
  }
  async function request(socket: Socket, event: string, payload: unknown = {}) {
    const result = await new Promise<Ack>((resolve, reject) => socket.timeout(5000).emit(event, payload, (err: Error | null, ack: Ack) => err ? reject(err) : resolve(ack)));
    expect(result.ok, result.error).toBe(true);
    return result;
  }
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const display = await connect(), created = await request(display, "room:create"), session = created.session!;
    const code = session.code, pin = created.room!.pairingCode!;
    await stage.setViewportSize({ width: 1920, height: 1080 });
    await stage.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
      { key: "vrille-session:v3:http://127.0.0.1:5173:DISPLAY_CLIENT", session });
    display.disconnect();
    await stage.goto("/?display=1&lang=fr");
    await stage.getByTestId("resume-session").click();
    await expect(stage.getByTestId("phase")).toHaveAttribute("data-phase", "lobby");
    const players: { socket: Socket; session: Session }[] = [];
    for (let index = 0; index < 3; index++) {
      const socket = await connect(), joined = await request(socket, "room:join", { code, name: `Comédien ${index + 1}`, avatar: AVATARS[index] });
      players.push({ socket, session: joined.session! });
    }
    const host = players[0]!;
    let current = (await request(host.socket, "room:claim-control", { pairingCode: pin })).room!;
    await request(host.socket, "room:configure", { ...structuredClone(DEFAULT_CONFIG), playlist: [{ gameId: "captions", rounds: 1 }], answerSeconds: 0, voteSeconds: 0, presentationSeconds: 0, balanced: false, autoAdvance: false });
    for (const player of players) await request(player.socket, "room:ready", { ready: true });
    current = (await request(host.socket, "room:start")).room!;
    async function advance() { current = (await request(host.socket, "room:advance", { transitionId: current.transitionId })).room!; }
    while (["party-intro", "intro", "rules"].includes(current.phase)) await advance();
    for (let turn = 0; turn < 3; turn++) {
      await expect(stage.locator(".cinema-projection")).toHaveCount(0);
      for (let index = 0; index < players.length; index++)
        await request(players[index]!.socket, "room:action", { type: "caption", text: `Doublage ${turn + 1} – comédien ${index + 1}` });
      await advance();
    }
    await advance();
    for (const player of players) await request(player.socket, "room:action", { type: "prepared" });
    await advance();
    expect(current.phase).toBe("presenting");
    const video = stage.locator(".cinema-screen video");
    await expect(video).toBeVisible();
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState), { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
    await expect(stage.locator(".cinema-subtitle p")).toContainText("Doublage");
    await mobile.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
      { key: "vrille-session:v3:http://127.0.0.1:5173:PLAYER_CLIENT", session: host.session });
    const controller = await mobile.newPage();
    host.socket.disconnect();
    await controller.goto("/?lang=fr");
    await controller.getByTestId("resume-session").click();
    await expect(controller.getByTestId("projection-play-pause")).toBeVisible();
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    await controller.getByTestId("projection-play-pause").click();
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false);
    await controller.getByTestId("projection-play-pause").click();
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    await controller.locator(".caption-playback-controls button").nth(1).click();
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeLessThan(2);
    const bounds = await video.boundingBox();
    expect(bounds!.width).toBeGreaterThan(1500);
    expect(bounds!.height).toBeGreaterThan(650);
    await stage.screenshot({ path: testInfo.outputPath("projection-1920x1080.png") });
    await controller.locator(".caption-playback-controls select").selectOption("slides");
    await expect(video).toHaveCount(0);
    await expect(stage.locator(".cinema-screen img")).toBeVisible();
    await controller.locator(".caption-playback-controls select").selectOption("video");
    await expect(video).toBeVisible();
    await expect(stage.getByTestId("phase")).toHaveAttribute("data-phase", "presenting");
  } finally {
    await mobile.close();
    for (const socket of sockets) socket.disconnect();
  }
});
