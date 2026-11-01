import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CATEGORIES, CONTENT, filterContent, MEDIA_LICENSE } from "./index.js";

describe("bibliothèque originale intégrée", () => {
  it("contient la banque minimale pour chacun des cinq jeux", () => {
    for (const [gameId, minimum] of Object.entries({
      mythos: 100,
      pitch: 100,
      court: 60,
      who: 100,
      captions: 20,
    })) {
      expect(
        CONTENT.filter((item) => item.gameId === gameId).length,
        gameId,
      ).toBeGreaterThanOrEqual(minimum);
    }
    expect(filterContent({ gameId: "who" })).toHaveLength(100);
    expect(filterContent({ gameId: "mythos" })).toHaveLength(100);
  });

  it("possède des identifiants stables uniques et des contenus distincts", () => {
    expect(new Set(CONTENT.map((item) => item.id)).size).toBe(CONTENT.length);
    expect(new Set(CONTENT.map((item) => item.prompt)).size).toBe(
      CONTENT.length,
    );
    for (const item of CONTENT) {
      expect(item.id).toMatch(new RegExp(`^${item.gameId}-\\d{3}$`));
      expect(item.category.length).toBeGreaterThan(0);
      expect(item.prompt.length).toBeGreaterThan(15);
      expect(CATEGORIES).toContain(item.category);
    }
  });

  it("fournit un nom et une description exploitables pour chaque produit", () => {
    const products = CONTENT.filter((item) => item.gameId === "pitch");
    expect(new Set(products.map((item) => item.product?.name)).size).toBe(
      products.length,
    );
    for (const item of products) {
      expect(item.product?.name.length).toBeGreaterThan(4);
      expect(item.product?.description.length).toBeGreaterThan(25);
    }
  });

  it("masque les thèmes adultes sans opt-in et applique toutes les exclusions sans réintroduire de contenu", () => {
    const classic = filterContent();
    expect(classic.every((item) => !item.adult)).toBe(true);
    expect(filterContent({ adult: true }).length).toBeGreaterThan(
      classic.length,
    );
    const light = filterContent({
      adult: true,
      disabledCategories: ["soirée adulte", "adulte", "relations"],
    });
    expect(
      light.every(
        (item) =>
          !["soirée adulte", "adulte", "relations"].includes(item.category),
      ),
    ).toBe(true);
    const disabledId = classic[0]!.id;
    expect(
      filterContent({ disabledIds: [disabledId] }).some(
        (item) => item.id === disabledId,
      ),
    ).toBe(false);
    expect(filterContent({ disabledCategories: CATEGORIES })).toEqual([]);
    expect(
      filterContent({
        gameId: "who",
        disabledCategories: [
          "aventures",
          "quotidien",
          "talents",
          "numérique",
          "imaginaire",
        ],
      }),
    ).toEqual([]);
  });

  it("accepte une bibliothèque fusionnée depuis l’administration et ne modifie pas les données source", () => {
    const item = {
      id: "custom-1",
      gameId: "mythos" as const,
      category: "test",
      prompt: "Une question ajoutée en administration.",
      adult: true,
    };
    const original = [...CONTENT];
    expect(filterContent({ adult: false }, [item])).toEqual([]);
    expect(filterContent({ adult: true }, [item])).toEqual([item]);
    expect(CONTENT).toEqual(original);
  });
});

describe("médias originaux", () => {
  const mediaDirectory = fileURLToPath(new URL("../media/", import.meta.url));

  it("livre vingt scènes locales différentes, accessibles et identifiées CC0", () => {
    expect(MEDIA_LICENSE.identifier).toBe("CC0-1.0");
    expect(
      readdirSync(mediaDirectory).filter((name) => name.endsWith(".svg")),
    ).toHaveLength(20);
    const source = CONTENT.filter((item) => item.gameId === "captions").map(
      (item) => {
        expect(item.mediaUrl).toMatch(/^\/media\/scene-\d{2}\.svg$/);
        const filename = item.mediaUrl!.replace("/media/", "");
        const svg = readFileSync(`${mediaDirectory}/${filename}`, "utf8");
        expect(svg).toContain('viewBox="0 0 960 600"');
        expect(svg).toContain('<title id="title">');
        expect(svg).toContain('<desc id="desc">');
        expect(svg).toContain("CC0-1.0");
        expect(svg).toContain("Original artwork");
        expect(svg).not.toMatch(
          /<script|<foreignObject|(?:href|src)=["'](?:https?:|data:|\/\/)|onload=/i,
        );
        return svg;
      },
    );
    expect(new Set(source).size).toBe(20);
  });
});
