import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": new URL("./", import.meta.url).pathname } },
  test: {
    environment: "node",
    include: ["tests/eval/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    testTimeout: 20_000,
  },
});
