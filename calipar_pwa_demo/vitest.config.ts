import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: [
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
      "tests/integration/**/*.test.ts",
      "tests/integration/**/*.test.tsx",
    ],
    exclude: ["tests/worker/**", "tests/e2e/**", "tests/a11y/**"],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "test-results/coverage",
      include: ["lib/**/*.ts", "components/**/*.tsx"],
      exclude: [
        "**/*.d.ts",
        "lib/seed/**",
        "lib/domain/types.ts",
        "components/icons/**",
        "components/icon.tsx",
      ],
      // Per-glob so adding the component layer cannot dilute the lib guarantee.
      // lib/** is unchanged. components/** is a floor set just under the real
      // number, there to stop the layer regressing to unmeasured; ratchet it up
      // as modal.tsx and pwa-bridge.tsx gain tests.
      thresholds: {
        "lib/**": {
          lines: 85,
          functions: 85,
          statements: 85,
          branches: 80,
        },
        "components/**": {
          lines: 27,
          functions: 25,
          statements: 25,
          branches: 28,
        },
      },
    },
  },
});
