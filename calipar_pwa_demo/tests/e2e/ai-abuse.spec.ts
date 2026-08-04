import { expect, test } from "@playwright/test";

import { assertNoRemoteBackends, enterDemo } from "./helpers";

/**
 * The abuse controls, exercised against real workerd with real rate-limit
 * bindings.
 *
 * **The bindings do enforce locally.** Verified by hand against
 * `npm run preview:e2e` before this spec was written: four POSTs to
 * `/api/ai/session` returned 503, 503, 429, 429 — the first two passing the
 * mint limit and failing later on the absent Turnstile secret, the last two
 * refused by `AI_MINT_LIMITER` at its 2/60s ceiling. So these assertions are
 * about enforcement, not merely wiring.
 *
 * Enforcement logic itself is covered far more cheaply at the Worker-unit level
 * in tests/worker/limits.test.ts and tests/worker/body.test.ts. What only this
 * layer can prove is that the bindings are declared, bound, and consulted in
 * the deployed configuration.
 *
 * Scoped to one project: a new spec under tests/ otherwise fans out across
 * chromium-desktop, chromium-mobile, and webkit, and three browsers sharing one
 * rate-limit bucket would race each other.
 */

const MINT_BURST = 5;

/**
 * Each test needs its own rate-limit bucket.
 *
 * `clientKey` hashes CF-Connecting-IP, so distinct addresses give distinct
 * buckets. Without this the mint-burst test below exhausts AI_MINT_LIMITER and
 * every later /api/ai/session assertion sees 429 instead of what it is testing
 * — including across reruns inside the same 60-second window. That is the
 * Worker behaving correctly (the mint limit deliberately runs before the body
 * read), so the tests must not share a caller identity.
 */
let bucket = 0;
function freshClient(): Record<string, string> {
  bucket += 1;
  // Unique per worker process as well as per call: Playwright runs two workers,
  // and a counter alone would hand the same address to both. Any string works —
  // the Worker hashes it into a bucket key — so this uses a private range wide
  // enough that reruns inside one 60-second window cannot collide either.
  const pid = process.pid;
  return { "CF-Connecting-IP": `10.${(pid >> 8) & 255}.${pid & 255}.${bucket}` };
}

test.describe("AI abuse controls", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop");
  });

  test("refuses a burst of session mints from one client", async ({ request, baseURL }) => {
    const client = freshClient();
    const statuses: number[] = [];
    let refusal: { status: number; retryAfter: string | undefined; code: string } | undefined;

    for (let attempt = 0; attempt < MINT_BURST; attempt += 1) {
      const response = await request.post("/api/ai/session", {
        headers: { Origin: new URL(baseURL!).origin, ...client },
        data: { turnstileToken: "not-a-real-token" },
      });
      statuses.push(response.status());
      if (response.status() === 429 && !refusal) {
        refusal = {
          status: response.status(),
          retryAfter: response.headers()["retry-after"],
          code: ((await response.json()) as { error: { code: string } }).error.code,
        };
      }
    }

    expect(
      statuses.filter((status) => status === 429).length,
      `expected the mint ceiling to engage within ${MINT_BURST} attempts, saw ${statuses.join(", ")}`,
    ).toBeGreaterThan(0);

    // Exhaustion is monotonic: once refused, every later attempt in the burst
    // is refused too. This is the assertion that would catch a limiter wired to
    // the wrong key, which would produce an intermittent 429 instead.
    const firstRefusal = statuses.indexOf(429);
    expect(statuses.slice(firstRefusal).every((status) => status === 429)).toBe(true);

    expect(refusal?.code).toBe("AI_RATE_LIMITED");
    expect(refusal?.retryAfter).toBe("60");
  });

  test("refuses an oversized body before contacting Turnstile", async ({ request, baseURL }) => {
    const response = await request.post("/api/ai/session", {
      headers: { Origin: new URL(baseURL!).origin, ...freshClient() },
      data: { turnstileToken: "a".repeat(100_000) },
    });

    expect(response.status()).toBe(413);
    const payload = (await response.json()) as { error: { code: string; message: string } };
    expect(payload.error.code).toBe("AI_VALIDATION_FAILED");
    expect(payload.error.message).toMatch(/too large/i);
  });

  /**
   * The undeclared-length (chunked) case is deliberately NOT exercised here.
   *
   * Measured against wrangler 4.115.0 on 2026-08-04: from a freshly started
   * `preview:e2e`, one chunked oversize POST to /api/ai/session produces the
   * correct 413 from the Worker and then kills the dev server — the next
   * /api/health returns 500, and the process exits shortly after. Reproduced
   * from a clean start with only that one request changed; the
   * declared-Content-Length case above leaves the server healthy.
   *
   * The Worker is not at fault: workerd returns the right status and a
   * well-formed error payload. `wrangler dev` cannot survive a response sent
   * while the client is still uploading. Shipping the chunked assertion here
   * would kill the server mid-suite and manufacture failures in every spec
   * that ran after it.
   *
   * That path is covered where it can be observed honestly:
   *   - tests/worker/body.test.ts asserts the reader stops early, which is the
   *     actual property the fix is about.
   *   - Re-verify against the real preview URL during release (Phase D), where
   *     the edge, not the dev proxy, terminates the request.
   */

  test("never leaks an upstream body or a secret in an error response", async ({
    request,
    baseURL,
  }) => {
    const response = await request.post("/api/ai/analyze", {
      headers: { Origin: new URL(baseURL!).origin, ...freshClient() },
      data: { content: "A short narrative" },
    });
    // Refused before any provider contact. Which refusal depends on what the
    // preview has configured: 503 when AI_SESSION_SECRET is absent (the usual
    // local case, since secrets live only in .dev.vars), 401 with a secret set
    // and no cookie, 429 if the mint burst above is still inside its window.
    expect([401, 429, 503]).toContain(response.status());
    const text = await response.text();
    expect(text).not.toMatch(/sk-or-v1-/);
    expect(text).not.toMatch(/openrouter\.ai/);
    expect(text).not.toMatch(/AI_SESSION_SECRET|TURNSTILE_SECRET/);
  });

  test("the browser still reaches no remote backend directly", async ({ page }) => {
    // Must run after navigation: it reads the page's resource timings.
    await enterDemo(page);
    await page.goto("/chat/");
    await assertNoRemoteBackends(page);
  });
});
