/**
 * The one list of paths a static export must contain.
 *
 * There used to be two, and they had diverged: `scripts/verify/artifacts.mjs`
 * required 13 entries and `scripts/cloudflare/check-free-limits.mjs` required
 * 16, the extra three being `.assetsignore`, `_headers`, and `404.html`. Both
 * run back to back in `npm run verify`, so the stricter one won in practice and
 * the divergence was invisible — until someone read only the looser list and
 * concluded a build was complete.
 *
 * **Adding a route means adding it here, and only here.**
 */
export const REQUIRED_EXPORTS = [
  // Deployment metadata Cloudflare reads from the asset directory.
  ".assetsignore",
  "_headers",

  // Unlisted-beta indexing refusal. Required so a build that silently drops it
  // fails the gate rather than quietly becoming indexable. REMOVE AT GA.
  "robots.txt",

  // Route shells. Every one of these is also a row in tests/a11y/routes.spec.ts.
  "index.html",
  "404.html",
  "dashboard/index.html",
  "reviews/index.html",
  "reviews/new/index.html",
  "reviews/editor/index.html",
  "data/index.html",
  "planning/index.html",
  "resources/index.html",
  "activity/index.html",
  "chat/index.html",
  "settings/index.html",

  // PWA surface.
  "manifest.webmanifest",
  "sw.js",
];
