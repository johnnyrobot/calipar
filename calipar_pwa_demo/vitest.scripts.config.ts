import { defineConfig } from "vitest/config";

/**
 * The release tooling in `scripts/` had no tests at all — 1045 lines of
 * gate-keeping logic, including a hand-written JSONC parser every Cloudflare
 * script depends on to read `wrangler.jsonc`.
 *
 * No coverage thresholds here, deliberately. Most files in `scripts/` are
 * top-level side-effecting programs that cannot be imported without running,
 * so a percentage over `scripts/**` would measure importability rather than
 * testing. What is testable is the pure logic in `lib.mjs`, and that is what
 * this covers.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/scripts/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
  },
});
