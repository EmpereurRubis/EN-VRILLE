import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const installedChrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  expect: { timeout: 12000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : process.platform === "win32" && existsSync(installedChrome)
          ? { executablePath: installedChrome }
          : {}),
    },
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      PUBLIC_URL: "http://127.0.0.1:5173",
      DATA_DIR: resolve(".local/e2e-data"),
      ADMIN_TOKEN: "e2e-admin-token-only-for-local-tests-123456",
      SESSION_SECRET: "e2e-session-secret-only-for-local-tests-123456",
    },
  },
});
