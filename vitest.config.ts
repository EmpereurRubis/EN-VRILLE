import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "apps/api/**/*.test.ts",
      "packages/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false,
  },
});
