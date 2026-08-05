/**
 * Unauthenticated smoke verification of a deployed preview or production URL.
 *
 * Task 15 Step 6 asks for "routes, manifest, service worker, offline behaviour,
 * Cache Storage, and API error shapes" against the exact returned URL.
 * `headers.mjs` only covered content types plus `/sw.js` caching, so everything
 * else was a manual checklist — the kind that gets eyeballed once and reported
 * as done. This makes it one command with an exit code.
 *
 * Deliberately requires NO secrets and NO session. Everything here is
 * observable by an anonymous visitor, which is what makes it safe to run
 * against production. The bounded AI canary that does need a session is Step 7
 * (`npm run test:ai:live`), not this.
 *
 * Cache Storage and the offline-after-install behaviour are NOT covered here:
 * both need a real browser with a service worker, which is `tests/e2e/pwa.spec.ts`
 * under Chromium. This script verifies the offline shell is *served*; it cannot
 * verify it is *precached*. Stated rather than silently skipped.
 *
 *   node scripts/verify/preview.mjs https://example.workers.dev
 */

import { REQUIRED_EXPORTS } from "../required-exports.mjs";

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/verify/preview.mjs <base-url>");
  process.exit(2);
}

const base = new URL(target);
let failed = 0;
let passed = 0;

function check(ok, label, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`  ok    ${label}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(name) {
  console.log(`\n${name}`);
}

/** Route shells, derived from the single required-exports list. */
const routePaths = REQUIRED_EXPORTS.filter((entry) =>
  entry.endsWith("index.html"),
).map((entry) => `/${entry.replace(/index\.html$/, "")}`);

section("Route shells");
for (const path of routePaths) {
  const url = new URL(path, base);
  let response;
  try {
    response = await fetch(url, { redirect: "manual" });
  } catch (error) {
    check(false, `GET ${path}`, String(error));
    continue;
  }
  const type = response.headers.get("content-type") ?? "";
  check(
    response.ok && type.includes("text/html"),
    `GET ${path}`,
    `${response.status} ${type}`,
  );

  // Security headers are set on every asset response by public/_headers. A
  // deployment that loses them is still "up", which is why this is asserted
  // per-route rather than once.
  const csp = response.headers.get("content-security-policy") ?? "";
  check(
    csp.includes("default-src 'self'") && csp.includes("object-src 'none'"),
    `  CSP on ${path}`,
    csp ? "present but unexpected" : "missing",
  );
}

section("Unlisted-beta indexing refusal (REMOVE THESE TWO AT GA)");
{
  const robots = await fetch(new URL("/robots.txt", base));
  const body = robots.ok ? await robots.text() : "";
  check(
    robots.ok && /^\s*Disallow:\s*\/\s*$/m.test(body),
    "GET /robots.txt disallows everything",
    `${robots.status}`,
  );

  const landing = await fetch(new URL("/", base));
  const html = landing.ok ? await landing.text() : "";
  check(
    /<meta name="robots" content="[^"]*noindex/i.test(html),
    "landing page carries noindex",
  );
}

section("PWA surface");
{
  const manifest = await fetch(new URL("/manifest.webmanifest", base));
  const type = manifest.headers.get("content-type") ?? "";
  check(
    manifest.ok && type.includes("manifest"),
    "GET /manifest.webmanifest",
    `${manifest.status} ${type}`,
  );
  if (manifest.ok) {
    let parsed;
    try {
      parsed = JSON.parse(await manifest.text());
    } catch {
      parsed = undefined;
    }
    check(Boolean(parsed), "manifest parses as JSON");
    if (parsed) {
      check(
        Array.isArray(parsed.icons) && parsed.icons.length > 0,
        "manifest declares icons",
      );
      check(
        typeof parsed.start_url === "string",
        "manifest declares start_url",
      );
    }
  }

  const sw = await fetch(new URL("/sw.js", base));
  const swCache = sw.headers.get("cache-control") ?? "";
  check(sw.ok, "GET /sw.js", `${sw.status}`);
  // A cached service worker is how a bad deploy becomes permanent.
  check(
    /no-cache|no-store|max-age=0/i.test(swCache),
    "/sw.js must revalidate",
    swCache || "no cache-control",
  );
  check(
    (sw.headers.get("service-worker-allowed") ?? "") === "/",
    "/sw.js declares root scope",
  );

  const offline = await fetch(new URL("/offline/", base));
  check(offline.ok, "GET /offline/ shell is served", `${offline.status}`);
}

section("Static asset caching");
{
  // Regression guard for the _headers append defect (f680b37): Cloudflare
  // concatenates directives from every matching rule, so a Cache-Control on /*
  // silently destroyed the immutable caching here and the page still worked.
  const landing = await fetch(new URL("/", base));
  const html = landing.ok ? await landing.text() : "";
  const chunk = html.match(/\/_next\/static\/[^"']+\.js/)?.[0];
  if (!chunk) {
    check(false, "found a hashed chunk to test", "none referenced in landing HTML");
  } else {
    const asset = await fetch(new URL(chunk, base));
    const cache = asset.headers.get("cache-control") ?? "";
    check(asset.ok, `GET ${chunk}`, `${asset.status}`);
    check(
      cache.includes("immutable"),
      "hashed chunk is immutable",
      cache || "no cache-control",
    );
    check(
      !/max-age=0/.test(cache),
      "hashed chunk has no conflicting max-age=0",
      cache,
    );
  }
}

section("API error shapes");
{
  const health = await fetch(new URL("/api/health", base));
  check(health.ok, "GET /api/health", `${health.status}`);

  const status = await fetch(new URL("/api/ai/status", base));
  check(status.ok, "GET /api/ai/status", `${status.status}`);
  if (status.ok) {
    const text = await status.text();
    // The site key is public and expected here. Anything shaped like a real
    // credential is not.
    check(
      !/sk-or-v1-/.test(text) && !/BEGIN [A-Z ]*PRIVATE KEY/.test(text),
      "/api/ai/status leaks no credential material",
    );
  }

  const origin = base.origin;
  const cases = [
    {
      label: "GET on a POST-only task route is 405",
      path: "/api/ai/chat",
      init: { method: "GET" },
      expect: 405,
    },
    {
      label: "POST without Origin is 403",
      path: "/api/ai/chat",
      init: { method: "POST", body: "{}" },
      expect: 403,
    },
    {
      label: "POST to an unknown AI route is 404",
      path: "/api/ai/not-a-task",
      init: { method: "POST", headers: { Origin: origin }, body: "{}" },
      expect: 404,
    },
    {
      // The only case here that depends on the Worker being fully configured.
      // `requireSession` calls `sessionSecret()` first, which throws 503
      // AI_NOT_CONFIGURED when AI_SESSION_SECRET is absent or under 32 bytes —
      // so a 503 here does not mean the route is broken, it means the secrets
      // were never created. That is a real Step 6 failure against a preview
      // that is supposed to be complete, and it is the expected reading when
      // running this against a local `wrangler dev` with no .dev.vars.
      label: "task route without a session is 401 (503 = secrets missing)",
      path: "/api/ai/chat",
      init: { method: "POST", headers: { Origin: origin }, body: "{}" },
      expect: 401,
    },
  ];

  for (const testCase of cases) {
    const response = await fetch(new URL(testCase.path, base), testCase.init);
    check(
      response.status === testCase.expect,
      testCase.label,
      `got ${response.status}`,
    );
    const body = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = undefined;
    }
    // The public contract is a normalised envelope. A raw upstream body or a
    // stack trace surfacing here is the failure this asserts against.
    check(
      Boolean(parsed?.error?.code) && Boolean(parsed?.error?.requestId),
      `  ${testCase.label} returns the error envelope`,
      body.slice(0, 80),
    );
  }
}

console.log(
  `\n${passed} passed, ${failed} failed against ${base.origin}` +
    "\nCache Storage and offline-after-install are NOT covered here — see" +
    " tests/e2e/pwa.spec.ts (Chromium only).",
);

if (failed > 0) process.exitCode = 1;
