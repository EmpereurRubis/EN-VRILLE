import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

async function phone(browser: Browser, code: string, index: number) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`/?room=${code}&lang=fr`);
  await page.getByRole("textbox", { name: "Ton pseudo", exact: true }).fill(`Mobile ${index + 1}`);
  await page.getByRole("button", { name: "Rejoindre le salon", exact: true }).click();
  await expect(page.getByTestId("phase")).toHaveAttribute("data-client-kind", "PLAYER_CLIENT");
  return { context, page };
}

async function advance(host: Page, stage: Page, phase: string) {
  await expect(host.getByTestId("controller-advance")).toBeEnabled();
  await host.getByTestId("controller-advance").click();
  await expect(stage.getByTestId("phase")).toHaveAttribute("data-phase", phase);
}

test("TV 1080p + cinq téléphones : association, configuration, cinq révélations manuelles et reprise", async ({ browser, page: stage }, testInfo) => {
  await stage.setViewportSize({ width: 1920, height: 1080 });
  await stage.goto("/?display=1&lang=fr");
  await stage.getByTestId("create-display").click();
  await expect(stage.getByTestId("phase")).toHaveAttribute("data-client-kind", "DISPLAY_CLIENT");
  await expect(stage.locator(".show-lobby-players > div")).toHaveCount(0);
  await expect(stage.locator(".show-lobby-invite svg")).toBeVisible();
  await expect(stage.locator("input, textarea")).toHaveCount(0);
  const code = (await stage.getByTestId("room-code").textContent())!.trim();
  const pin = (await stage.getByTestId("pairing-code").textContent())!.trim();
  expect(await stage.locator(".show-public-invite").getAttribute("href")).not.toContain(pin);
  const phones: { context: BrowserContext; page: Page }[] = [];
  try {
    for (let i = 0; i < 5; i++) phones.push(await phone(browser, code, i));
    await expect(stage.locator(".show-lobby-players > div")).toHaveCount(5);
    const host = phones[0]!.page;
    await expect(host.getByTestId("controller-start")).toHaveCount(0);
    await host.locator(".controller-pairing summary").click();
    await host.getByTestId("claim-control-code").fill(pin);
    await host.getByTestId("claim-control-submit").click();
    await expect(host.getByTestId("controller-start")).toBeVisible();
    await expect(stage.getByTestId("pairing-code")).toHaveCount(0);
    await expect(host.locator(".game-poster")).toHaveCount(5);
    // Configure a single Mythos round entirely on the controller phone.
    await host.locator(".game-lineup-item").nth(2).locator(".game-lineup-buttons button").last().click();
    await host.locator(".game-lineup-item").nth(1).locator(".game-lineup-buttons button").last().click();
    await expect(host.locator(".game-lineup-item")).toHaveCount(1);
    await host.locator(".game-lineup-rounds select").selectOption("1");
    for (const { page } of phones) await page.getByRole("button", { name: "Je suis prêt", exact: true }).click();
    await expect(host.getByTestId("controller-start")).toBeEnabled();
    await host.getByTestId("controller-start").click();
    await expect(stage.getByTestId("phase")).toHaveAttribute("data-phase", "party-intro");
    await advance(host, stage, "intro");
    await advance(host, stage, "rules");
    await advance(host, stage, "writing");
    await expect(host.getByTestId("controller-advance")).toBeDisabled();
    for (const [index, { page }] of phones.entries()) {
      const response = index === 4 ? `Réponse navigateur 5 : ${"une explication très absurde mais lisible à distance. ".repeat(8)}`.slice(0, 350) : `Réponse navigateur ${index + 1}`;
      await page.locator(".answer-form textarea").fill(response);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      expect(overflow, "mobile writing should fit the viewport").toBe(false);
      await page.locator(".answer-form button").last().click();
      await expect(page.locator(".submitted-state")).toBeVisible();
    }
    await expect(stage.getByTestId("phase")).toHaveAttribute("data-phase", "writing");
    await expect(stage.locator(".show-progress strong")).toContainText("5");
    const names: string[] = [];
    await advance(host, stage, "reveal");
    for (let index = 0; index < 5; index++) {
      const answer = stage.getByTestId("revealed-answer");
      await expect(answer).toHaveCount(1);
      await expect(answer).toContainText("Réponse navigateur");
      const current = (await answer.textContent())!;
      expect(names).not.toContain(current);
      names.push(current);
      await expect(answer).not.toContainText("Mobile");
      await expect(answer).toHaveCSS("opacity", "1");
      const bounds = await answer.boundingBox();
      expect(bounds!.y).toBeGreaterThan(80);
      expect(bounds!.y + bounds!.height).toBeLessThan(1010);
      if (index === 0) {
        await expect(answer).toHaveCSS("opacity", "1");
        await stage.screenshot({ path: testInfo.outputPath("mythos-reveal-1920x1080.png") });
      }
      if (index < 4) {
        await expect(host.getByTestId("controller-advance")).toBeEnabled();
        await host.getByTestId("controller-advance").dblclick();
        await expect(answer).not.toHaveText(current);
        await expect(stage.getByTestId("phase")).toHaveAttribute("data-phase", "reveal");
      }
    }
    expect(names).toHaveLength(5);
    await advance(host, stage, "voting");
    for (const { page } of phones) {
      await expect(page.locator(".vote-option")).toHaveCount(4);
      await page.locator(".vote-option").first().click();
      await expect(page.locator(".vote-confirmation")).toBeVisible();
    }
    await advance(host, stage, "results");
    // Reload a phone after its submitted vote: it proposes the same persisted identity.
    const returning = phones[2]!.page;
    await returning.reload();
    await returning.getByRole("button", { name: "Reprendre ma partie", exact: true }).click();
    await expect(returning.locator(".controller-identity")).toContainText("Mobile 3");
    await expect(stage.locator(".show-stage-episode")).not.toContainText("6 joueurs");
    await host.screenshot({ path: testInfo.outputPath("controller-mobile-390x844.png"), fullPage: true });
  } finally {
    for (const { context } of phones) await context.close();
  }
});
