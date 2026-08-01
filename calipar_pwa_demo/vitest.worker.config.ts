import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    include: ["tests/worker/**/*.test.ts"],
    exclude: ["tests/e2e/**", "tests/a11y/**"],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "test-results/coverage-worker",
      include: ["worker/**/*.ts"],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 85,
      },
    },
  },
});
