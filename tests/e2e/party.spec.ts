import { test, expect, type Page } from "@playwright/test";

async function phase(page: Page, value: string) {
  await expect(page.getByTestId("phase")).toHaveAttribute("data-phase", value);
}

test("trois navigateurs : lobby, réponses privées, votes, podium et reconnexion", async ({
  browser,
  page: host,
}) => {
  const errors: string[] = [];
  host.on("pageerror", (error) => errors.push(error.message));
  await host.goto("/");
  await host
    .getByRole("button", { name: "Créer une partie", exact: true })
    .first()
    .click();
  await host
    .getByRole("textbox", { name: "Ton pseudo", exact: true })
    .fill("Camille");
  await host
    .getByRole("button", { name: "Créer un salon", exact: true })
    .click();
  await phase(host, "lobby");
  const code = (await host.getByTestId("room-code").innerText()).trim();
  expect(code).toMatch(/^[A-Z0-9]{6}$/);
  const invitation = host.locator("a.invite-url");
  await expect(invitation).toHaveAttribute("href", new RegExp(`room=${code}`));

  const aliceContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const bobContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const alice = await aliceContext.newPage();
  const bob = await bobContext.newPage();
  try {
    for (const [guest, name] of [
      [alice, "Alex"],
      [bob, "Sacha"],
    ] as const) {
      guest.on("pageerror", (error) => errors.push(error.message));
      await guest.goto(`/?room=${code}`);
      await guest
        .getByRole("textbox", { name: "Ton pseudo", exact: true })
        .fill(name);
      await guest
        .getByRole("button", { name: "Rejoindre le salon", exact: true })
        .click();
      await phase(guest, "lobby");
      await guest
        .getByRole("button", { name: "Je suis prêt", exact: true })
        .click();
    }
    await expect(host.getByText("3/12 joueurs", { exact: true })).toBeVisible();
    await expect(alice.getByTestId("room-code")).toHaveText(code);
    expect(
      await alice.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    await host
      .getByRole("button", {
        name: "Supprimer Sous-titres Interdits 3",
        exact: true,
      })
      .click();
    await host
      .getByRole("button", {
        name: "Supprimer Qui parmi nous ? 2",
        exact: true,
      })
      .click();
    await host
      .getByRole("spinbutton", { name: "Manches Les Mythos 1", exact: true })
      .fill("1");
    await host
      .getByRole("button", { name: "Lancer la soirée", exact: true })
      .click();
    await phase(host, "intro");
    await host
      .getByRole("button", { name: "Étape suivante", exact: true })
      .click();
    await phase(host, "writing");

    const answers = [
      "Un pigeon a racheté le conseil municipal.",
      "Le grille-pain dirige le comité secret.",
      "Une chaussette organise toutes les réunions.",
    ];
    for (const [index, player] of [host, alice, bob].entries()) {
      await phase(player, "writing");
      await player
        .getByRole("textbox", { name: "Ta réponse", exact: true })
        .fill(answers[index]);
      await player
        .getByRole("button", { name: "Envoyer ma réponse", exact: true })
        .click();
      if (index === 0)
        await expect(alice.getByText(answers[0], { exact: true })).toHaveCount(
          0,
        );
    }
    await phase(host, "voting");
    for (const [index, player] of [host, alice, bob].entries()) {
      await phase(player, "voting");
      await player
        .getByRole("button")
        .filter({ hasText: answers[(index + 1) % 3] })
        .click();
    }
    await host
      .getByRole("button", { name: "Étape suivante", exact: true })
      .click();
    await phase(host, "results");
    await phase(alice, "results");
    await host.reload();
    await phase(host, "results");
    await expect(host.getByRole("alert")).toHaveCount(0);
    await host
      .getByRole("button", { name: "Étape suivante", exact: true })
      .click();
    await phase(host, "podium");
    await phase(bob, "podium");
    await expect(
      host.getByText("Camille", { exact: true }).first(),
    ).toBeVisible();
    await host.screenshot({ path: ".local/podium.png", fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    await aliceContext.close();
    await bobContext.close();
  }
});

test("accueil mobile, catalogue, accessibilité du dialogue et animations réduites", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", {
      name: "Réglages du son et des animations",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("switch", { name: /Réduire les animations/ }),
  ).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Créer une partie", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("textbox", { name: "Ton pseudo", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Ton pseudo", exact: true })
    .fill("Moi");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await page.screenshot({ path: ".local/mobile.png", fullPage: true });
});
