import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

async function load(desktop = false) {
  vi.stubGlobal("window", desktop ? { enVrilleDesktop: { serverUrl: "https://party.example.test/" } } : {});
  return import("../apps/web/src/backend");
}

describe("desktop network boundary", () => {
  it("preserves browser requests against their current origin", async () => {
    const { serverResource, serverFetch } = await load();
    const fetch = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetch);
    expect(serverResource("/media/custom/upload.webp")).toBe("/media/custom/upload.webp");
    await serverFetch("/api/catalog");
    expect(fetch).toHaveBeenCalledWith("/api/catalog", undefined);
  });

  it("keeps all packaged scenes local while routing game data and uploads to the selected server", async () => {
    const { serverResource, serverFetch } = await load(true);
    const fetch = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetch);
    for (let scene = 1; scene <= 20; scene++) {
      const path = `/media/scene-${String(scene).padStart(2, "0")}.svg`;
      expect(serverResource(path)).toBe(path);
    }
    expect(serverResource("/media/custom/upload.webp")).toBe("https://party.example.test/media/custom/upload.webp");
    expect(serverResource("./assets/presenter.svg")).toBe("./assets/presenter.svg");
    expect(serverResource("https://cdn.example.test/media.webp")).toBe("https://cdn.example.test/media.webp");
    await serverFetch("/api/admin/media", { method: "POST" });
    expect(fetch).toHaveBeenCalledWith("https://party.example.test/api/admin/media", { method: "POST" });
  });

  it("accepts a server origin and rejects credentials, protocols and URL additions", async () => {
    const { validateServerUrl } = await load();
    expect(validateServerUrl(" https://party.example.test/ ")).toBe("https://party.example.test");
    expect(validateServerUrl("http://127.0.0.1:8888")).toBe("http://127.0.0.1:8888");
    for (const invalid of ["app://game", "file:///C:/private", "javascript:alert(1)", "http://example.test", "https://user:secret@example.test", "https://example.test/extra", "https://example.test?token=value", "https://example.test#fragment", "example.test"]) {
      expect(() => validateServerUrl(invalid)).toThrow();
    }
  });
});
