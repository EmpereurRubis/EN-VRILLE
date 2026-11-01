import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { CONTENT } from "@en-vrille/content";
import { FileStore } from "../src/store.js";

vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, rename: vi.fn(original.rename) };
});

let directory: string;
beforeEach(async () => {
  const original =
    await vi.importActual<typeof import("node:fs/promises")>(
      "node:fs/promises",
    );
  vi.mocked(rename).mockReset().mockImplementation(original.rename);
  directory = await mkdtemp(join(tmpdir(), "vrille-recovery-"));
});
afterEach(async () => {
  const target = resolve(directory),
    parent = resolve(tmpdir()) + sep;
  if (
    !target.startsWith(parent) ||
    !basename(target).startsWith("vrille-recovery-")
  )
    throw new Error("Refus de nettoyer un dossier hors du répertoire de test.");
  await rm(target, { recursive: true, force: true });
});

describe("reprise du stockage fichier après une erreur de disque", () => {
  it.each(["EPERM", "EACCES", "EBUSY"])(
    "réessaie un remplacement temporairement bloqué par %s",
    async (code) => {
      const store = new FileStore(directory);
      await store.load();
      vi.mocked(rename).mockRejectedValueOnce(
        Object.assign(new Error("Fichier temporairement verrouillé"), { code }),
      );
      await store.saveContent(CONTENT.slice(0, 2));
      expect(rename).toHaveBeenCalledTimes(2);
      expect((await new FileStore(directory).load()).content).toHaveLength(2);
      await store.close();
    },
  );

  it("borne les essais, préserve le fichier précédent et accepte l’écriture suivante", async () => {
    const store = new FileStore(directory);
    await store.load();
    await store.saveContent(CONTENT.slice(0, 1));
    const previous = await readFile(resolve(directory, "state.json"), "utf8");
    vi.mocked(rename)
      .mockClear()
      .mockRejectedValue(
        Object.assign(new Error("Fichier verrouillé durablement"), {
          code: "EPERM",
        }),
      );
    await expect(store.saveContent(CONTENT.slice(0, 2))).rejects.toMatchObject({
      code: "EPERM",
    });
    expect(rename).toHaveBeenCalledTimes(8);
    expect(await readFile(resolve(directory, "state.json"), "utf8")).toBe(
      previous,
    );
    const original =
      await vi.importActual<typeof import("node:fs/promises")>(
        "node:fs/promises",
      );
    vi.mocked(rename).mockImplementation(original.rename);
    await store.saveContent(CONTENT.slice(0, 3));
    expect((await new FileStore(directory).load()).content).toHaveLength(3);
    await store.close();
  });

  it("ne réessaie pas une erreur non transitoire et ne bloque pas les sauvegardes futures", async () => {
    const store = new FileStore(directory);
    await store.load();
    vi.mocked(rename).mockRejectedValueOnce(
      Object.assign(new Error("Erreur disque"), { code: "EIO" }),
    );
    await expect(store.saveContent(CONTENT.slice(0, 1))).rejects.toMatchObject({
      code: "EIO",
    });
    expect(rename).toHaveBeenCalledTimes(1);
    await store.saveContent(CONTENT.slice(0, 2));
    expect((await new FileStore(directory).load()).content).toHaveLength(2);
    await store.close();
  });
});
