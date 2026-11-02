import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.spec.ts",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:5173", headless: true, trace: "retain-on-failure" },
  webServer: [
    { command: "node --import tsx tests/browser/server.ts", url: "http://127.0.0.1:3001/api/health", reuseExistingServer: false, timeout: 30_000 },
    { command: "npm exec -w @en-vrille/web -- vite preview --host 127.0.0.1 --port 5173 --strictPort", url: "http://127.0.0.1:5173", reuseExistingServer: false, timeout: 30_000 },
  ],
});
