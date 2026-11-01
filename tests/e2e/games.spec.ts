import { test, expect, type Page } from "@playwright/test";
import { io, type Socket } from "socket.io-client";
import { AVATARS, DEFAULT_CONFIG } from "@en-vrille/shared";
import type { Ack, Session } from "@en-vrille/shared";

const names = [
  "Alix Test",
  "Basile Test",
  "Charlie Test",
  "Dorian Test",
  "Éden Test",
];
async function phase(page: Page, value: string) {
  await expect(page.getByTestId("phase")).toHaveAttribute("data-phase", value);
}
async function advance(host: Page, nextPhase: string) {
  await host
    .getByRole("button", { name: "Étape suivante", exact: true })
    .click();
  await phase(host, nextPhase);
}
function emit(socket: Socket, event: string, data: unknown = {}): Promise<Ack> {
  return new Promise((resolve, reject) =>
    socket
      .timeout(5000)
      .emit(event, data, (error: Error | null, ack: Ack) =>
        error
          ? reject(error)
          : ack.ok
            ? resolve(ack)
            : reject(new Error(`${event}: ${ack.error}`)),
      ),
  );
}
async function seed() {
  const sockets: Socket[] = [],
    sessions: Session[] = [];
  try {
    for (let i = 0; i < 5; i++) {
      const socket = io("http://127.0.0.1:3001", {
        transports: ["websocket"],
        reconnection: false,
        forceNew: true,
      });
      sockets.push(socket);
      await new Promise<void>((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("connect_error", reject);
      });
      const result = await emit(socket, i === 0 ? "room:create" : "room:join", {
        name: names[i],
        avatar: AVATARS[i],
        ...(i ? { code: sessions[0]!.code } : {}),
      });
      sessions.push(result.session!);
      if (i) await emit(socket, "room:ready", { ready: true });
    }
    await emit(sockets[0]!, "room:configure", {
      ...structuredClone(DEFAULT_CONFIG),
      playlist: [
        { gameId: "pitch", rounds: 1, pitchMode: "invented" },
        { gameId: "pitch", rounds: 1, pitchMode: "random" },
        { gameId: "court", rounds: 1 },
        { gameId: "who", rounds: 1 },
        { gameId: "captions", rounds: 1 },
      ],
      answerSeconds: 180,
      voteSeconds: 120,
      presentationSeconds: 180,
      transitionSeconds: 60,
      allowVoteChange: true,
    });
    await emit(sockets[0]!, "room:start");
    await emit(sockets[0]!, "room:pause", { paused: true });
    return sessions;
  } finally {
    for (const socket of sockets) socket.disconnect();
  }
}

test("cinq navigateurs : inventions privées, ventes, tribunal, soupçons et légendes jusqu’au podium", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const sessions = await seed(),
    contexts = await Promise.all(
      sessions.map(() =>
        browser.newContext({ viewport: { width: 1280, height: 900 } }),
      ),
    );
  const errors: string[] = [],
    pages: Page[] = [];
  try {
    for (let i = 0; i < contexts.length; i++) {
      await contexts[i]!.addInitScript((session) => {
        sessionStorage.setItem("vrille-session", JSON.stringify(session));
        localStorage.setItem("vrille-volume", "0");
      }, sessions[i]!);
      const page = await contexts[i]!.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      pages.push(page);
      await page.goto("/");
      await phase(page, "intro");
    }
    const host = pages[0]!;
    await host.getByRole("button", { name: "Reprendre", exact: true }).click();
    await expect(host.locator(".pause-banner")).toHaveCount(0);

    const products = names.map((_, i) => `Invention secrète numéro ${i + 1}`);
    await advance(host, "writing");
    for (let i = 0; i < pages.length; i++) {
      await phase(pages[i]!, "writing");
      await pages[i]!.getByRole("textbox", {
        name: "Nom du produit",
        exact: true,
      }).fill(products[i]!);
      await pages[i]!.getByRole("textbox", {
        name: "Description du produit",
        exact: true,
      }).fill(`Un produit inventé par le joueur ${i + 1}, absolument inutile.`);
      await pages[i]!.getByRole("button", {
        name: "Envoyer mon invention",
        exact: true,
      }).click();
      if (i === 0)
        await expect(
          pages[1]!.getByText(products[0]!, { exact: true }),
        ).toHaveCount(0);
    }
    await Promise.all(pages.map((page) => phase(page, "prepare")));
    const assigned = await Promise.all(
      pages.map((page) =>
        page.locator(".preparation .product-card h2").innerText(),
      ),
    );
    expect([...assigned].sort()).toEqual([...products].sort());
    expect(assigned.every((name, index) => name !== products[index])).toBe(
      true,
    );

    async function presentationsAndRatings(expectedProducts?: string[]) {
      await advance(host, "presenting");
      const presented: string[] = [];
      for (let i = 0; i < 5; i++) {
        await expect(host.locator(".presentation-content .pill")).toHaveText(
          `Passage ${i + 1} / 5`,
        );
        presented.push(
          await host
            .locator(".presentation-content .product-card h2")
            .innerText(),
        );
        await host
          .getByRole("button", { name: "Étape suivante", exact: true })
          .click();
      }
      if (expectedProducts)
        expect(presented.sort()).toEqual([...expectedProducts].sort());
      await Promise.all(pages.map((page) => phase(page, "voting")));
      await Promise.all(
        pages.map(async (page, playerIndex) => {
          const cards = page.locator(".rating-card");
          await expect(cards).toHaveCount(4);
          // Exercise every rating criterion; other cards keep the deliberately visible default of 3/5.
          const first = cards.first();
          await first
            .getByRole("button", { name: /^Humour 4 sur 5 pour / })
            .click();
          await first
            .getByRole("button", { name: /^Conviction 5 sur 5 pour / })
            .click();
          await first
            .getByRole("button", { name: /^Créativité 4 sur 5 pour / })
            .click();
          for (let card = 0; card < 4; card++) {
            await expect(
              cards.nth(card).locator(".speaker-badge small"),
            ).not.toHaveText(names[playerIndex]!);
            await cards
              .nth(card)
              .getByRole("button", { name: "Valider mes notes", exact: true })
              .click();
            await expect(
              cards
                .nth(card)
                .getByRole("button", {
                  name: "Mettre à jour ma note",
                  exact: true,
                }),
            ).toBeVisible();
          }
        }),
      );
      await advance(host, "results");
      await expect(host.locator(".product-reveal")).toHaveCount(5);
    }

    await presentationsAndRatings(products);
    for (const product of products)
      await expect(
        host.locator(".product-reveal").filter({ hasText: product }),
      ).toContainText("Imaginé par");
    await advance(host, "transition");
    await advance(host, "intro");

    await advance(host, "prepare");
    const randomProducts = await Promise.all(
      pages.map(async (page) => {
        await phase(page, "prepare");
        return page.locator(".preparation .product-card h2").innerText();
      }),
    );
    expect(new Set(randomProducts).size).toBe(5);
    expect(randomProducts.every((name) => !products.includes(name))).toBe(true);
    await presentationsAndRatings(randomProducts);
    await expect(host.locator(".product-reveal").first()).not.toContainText(
      "Imaginé par",
    );
    await advance(host, "transition");
    await advance(host, "intro");

    await advance(host, "prepare");
    const note = "Plaidoirie confidentielle : mon client était un grille-pain.";
    await host
      .getByRole("textbox", { name: "Notes privées", exact: true })
      .fill(note);
    await host
      .getByRole("button", { name: "Garder mes notes", exact: true })
      .click();
    await expect(host.getByText(note, { exact: true })).toBeVisible();
    await expect(pages[1]!.getByText(note, { exact: true })).toHaveCount(0);
    await advance(host, "presenting");
    for (const step of [
      "L’accusation",
      "La défense",
      "Les témoins et le jury",
      "Derniers arguments",
    ]) {
      await expect(host.locator(".court-step h2")).toHaveText(step);
      await host
        .getByRole("button", { name: "Étape suivante", exact: true })
        .click();
    }
    await Promise.all(pages.map((page) => phase(page, "voting")));
    let jurors = 0;
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]!,
        isJury = await page
          .getByRole("button", { name: "Non coupable", exact: true })
          .count();
      jurors += isJury;
      await page
        .getByRole("combobox", { name: "Meilleure intervention", exact: true })
        .selectOption(sessions[i === 0 ? 1 : 0]!.playerId);
      if (isJury) {
        await page
          .getByRole("button", { name: "Non coupable", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Rendre mon verdict", exact: true })
          .click();
      } else {
        await expect(page.locator(".verdict-options")).toHaveCount(0);
        await page
          .getByRole("button", {
            name: "Voter pour cette intervention",
            exact: true,
          })
          .click();
      }
      await expect(page.locator(".vote-confirmation")).toBeVisible();
    }
    expect(jurors).toBe(1);
    await advance(host, "results");
    await expect(host.locator(".verdict-stamp")).toHaveText("NON COUPABLE !");
    await expect(pages[1]!.getByText(note, { exact: true })).toHaveCount(0);
    await expect(host.locator(".round-points")).not.toContainText(names[4]!);
    await advance(host, "transition");
    await advance(host, "intro");

    await advance(host, "voting");
    await Promise.all(
      pages.map(async (page, index) => {
        await phase(page, "voting");
        await expect(page.locator(".vote-option")).toHaveCount(4);
        await expect(
          page.locator(".vote-option").filter({ hasText: names[index]! }),
        ).toHaveCount(0);
        await page
          .locator(".vote-option")
          .filter({ hasText: names[index === 0 ? 1 : 0]! })
          .click();
        await expect(page.locator(".vote-confirmation")).toBeVisible();
      }),
    );
    await advance(host, "results");
    await expect(host.locator(".who-results > div").first()).toContainText(
      names[0]!,
    );
    await expect(host.locator(".who-results > div").first()).toContainText(
      "4 votes",
    );
    await advance(host, "transition");
    await advance(host, "intro");

    await advance(host, "writing");
    const captions = names.map(
      (_, index) => `Légende confidentielle numéro ${index + 1}`,
    );
    await Promise.all(
      pages.map(async (page) => {
        await phase(page, "writing");
        const image = page.locator(".prompt-media img");
        await expect(image).toBeVisible();
        await expect
          .poll(() =>
            image.evaluate(
              (element: HTMLImageElement) =>
                element.complete && element.naturalWidth > 0,
            ),
          )
          .toBe(true);
      }),
    );
    for (let i = 0; i < pages.length; i++) {
      await pages[i]!.getByRole("textbox", {
        name: "Ta réponse",
        exact: true,
      }).fill(captions[i]!);
      await pages[i]!.getByRole("button", {
        name: "Envoyer ma réponse",
        exact: true,
      }).click();
      if (i === 0)
        await expect(
          pages[1]!.getByText(captions[0]!, { exact: true }),
        ).toHaveCount(0);
    }
    await Promise.all(
      pages.map(async (page, index) => {
        await phase(page, "voting");
        await expect(
          page.locator(".vote-option").filter({ hasText: captions[index]! }),
        ).toHaveCount(0);
        await page
          .locator(".vote-option")
          .filter({ hasText: captions[(index + 1) % 5]! })
          .click();
        await expect(page.locator(".vote-confirmation")).toBeVisible();
      }),
    );
    await advance(host, "results");
    await expect(host.locator(".revealed-answer")).toHaveCount(5);
    await expect(host.locator(".round-points > div")).toHaveCount(5);
    await advance(host, "podium");
    await Promise.all(pages.map((page) => phase(page, "podium")));
    await expect(host.locator(".podium-player")).toHaveCount(3);
    await expect(host.locator(".leaderboard-row")).toHaveCount(5);
    expect(
      (await host.locator(".leaderboard-score > strong").allInnerTexts()).every(
        (score) => Number(score.replace(/\D/g, "")) > 0,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    for (const context of contexts) await context.close();
  }
});
