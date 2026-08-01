import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  handleRequest,
  type Env,
  type RateLimitBinding,
} from "../../worker/index";

const origin = "https://calipar.example";
const sessionSecret = "test-session-secret-that-is-longer-than-32-characters";

function env(overrides: Partial<Env> = {}): Env {
  const limiter: RateLimitBinding = {
    limit: vi.fn(async () => ({ success: true })),
  };
  return {
    OPENROUTER_API_KEY: "test-openrouter-key",
    TURNSTILE_SECRET_KEY: "test-turnstile-secret",
    TURNSTILE_SITE_KEY: "test-turnstile-site-key",
    AI_SESSION_SECRET: sessionSecret,
    AI_RATE_LIMITER: limiter,
    BUILD_SHA: "abc123",
    APP_VERSION: "1.0.0",
    ...overrides,
  };
}

function request(
  path: string,
  init: RequestInit = {},
  includeOrigin = true,
): Request {
  const headers = new Headers(init.headers);
  if (includeOrigin) {
    headers.set("Origin", origin);
    headers.set("Sec-Fetch-Site", "same-origin");
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return new Request(`${origin}${path}`, { ...init, headers });
}

async function createCookie(targetEnv: Env): Promise<string> {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  const response = await handleRequest(
    request("/api/ai/session", {
      method: "POST",
      body: JSON.stringify({ turnstileToken: "valid-token" }),
    }),
    targetEnv,
  );
  expect(response.status).toBe(200);
  const cookie = response.headers.get("Set-Cookie");
  expect(cookie).toContain("HttpOnly");
  return cookie!.split(";")[0]!;
}

describe("CALIPAR AI Worker", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns redacted health and status information", async () => {
    const targetEnv = env();
    const health = await handleRequest(
      request("/api/health", {}, false),
      targetEnv,
    );
    expect(health.status).toBe(200);
    await expect(health.json()).resolves.toEqual({
      ok: true,
      service: "calipar-pwa-demo",
      appVersion: "1.0.0",
      buildSha: "abc123",
    });

    const status = await handleRequest(
      request("/api/ai/status", {}, false),
      targetEnv,
    );
    await expect(status.json()).resolves.toEqual({
      configured: true,
      freeOnly: true,
      zeroDataRetention: true,
      dataCollection: "deny",
      sessionRequired: true,
      turnstileSiteKey: "test-turnstile-site-key",
    });
  });

  it("rejects cross-origin and oversized requests before provider access", async () => {
    const crossOrigin = await handleRequest(
      request(
        "/api/ai/analyze",
        {
          method: "POST",
          headers: { Origin: "https://attacker.example" },
          body: JSON.stringify({ content: "test" }),
        },
        false,
      ),
      env(),
    );
    expect(crossOrigin.status).toBe(403);

    const oversized = await handleRequest(
      request("/api/ai/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(65 * 1024),
        },
        body: JSON.stringify({ turnstileToken: "test" }),
      }),
      env(),
    );
    expect(oversized.status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("validates Turnstile and issues a signed secure session cookie", async () => {
    const targetEnv = env();
    const cookie = await createCookie(targetEnv);
    expect(cookie).toMatch(/^calipar_ai_session=/);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    );
    expect(init?.body?.toString()).toContain("secret=test-turnstile-secret");
    expect(init?.body?.toString()).not.toContain("test-openrouter-key");
  });

  it("fails closed without a session or rate limiter", async () => {
    const missingSession = await handleRequest(
      request("/api/ai/analyze", {
        method: "POST",
        body: JSON.stringify({ content: "A short narrative" }),
      }),
      env(),
    );
    expect(missingSession.status).toBe(401);
    expect((await missingSession.json()).error.code).toBe(
      "AI_SESSION_REQUIRED",
    );

    const noLimiterEnv = env({ AI_RATE_LIMITER: undefined });
    const cookie = await createCookie(noLimiterEnv);
    const noLimiter = await handleRequest(
      request("/api/ai/analyze", {
        method: "POST",
        headers: { Cookie: cookie },
        body: JSON.stringify({ content: "A short narrative" }),
      }),
      noLimiterEnv,
    );
    expect(noLimiter.status).toBe(503);
    expect((await noLimiter.json()).error.code).toBe("AI_NOT_CONFIGURED");
  });

  it("enforces the Worker rate-limit binding", async () => {
    const limiter: RateLimitBinding = {
      limit: vi.fn(async () => ({ success: false })),
    };
    const targetEnv = env({ AI_RATE_LIMITER: limiter });
    const cookie = await createCookie(targetEnv);
    const response = await handleRequest(
      request("/api/ai/analyze", {
        method: "POST",
        headers: { Cookie: cookie },
        body: JSON.stringify({ content: "A short narrative" }),
      }),
      targetEnv,
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect((await response.json()).error.code).toBe("AI_RATE_LIMITED");
  });

  it("sends only free, ZDR, zero-price structured requests and filters evidence", async () => {
    const targetEnv = env();
    const cookie = await createCookie(targetEnv);
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          model: "google/gemma-3-27b-it:free",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "Enrollment improved.",
                  strengths: ["Clear trend"],
                  concerns: [],
                  recommendations: ["Continue monitoring"],
                  insufficientData: false,
                  evidenceIds: ["metric-1", "fabricated-id"],
                }),
              },
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );

    const response = await handleRequest(
      request("/api/ai/analyze", {
        method: "POST",
        headers: { Cookie: cookie },
        body: JSON.stringify({
          content: "Enrollment improved according to the supplied metric.",
          facts: { enrollmentChange: 4.2 },
          evidence: [
            { id: "metric-1", title: "Enrollment", text: "Change: 4.2%" },
          ],
        }),
      }),
      targetEnv,
    );
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.evidenceIds).toEqual(["metric-1"]);
    expect(result.meta.model).toBe("google/gemma-3-27b-it:free");

    const [url, init] = vi.mocked(fetch).mock.calls[1]!;
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("openrouter/free");
    expect(body.provider).toMatchObject({
      allow_fallbacks: true,
      max_price: { prompt: 0, completion: 0, request: 0 },
      data_collection: "deny",
      zdr: true,
      require_parameters: true,
    });
    expect(body.response_format.type).toBe("json_schema");
    expect(String(init?.headers)).not.toContain("test-openrouter-key");
  });

  it("rejects a structured response from a non-free model", async () => {
    const targetEnv = env();
    const cookie = await createCookie(targetEnv);
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          model: "paid/model",
          choices: [{ message: { content: "{}" } }],
        }),
      ),
    );
    const response = await handleRequest(
      request("/api/ai/expand", {
        method: "POST",
        headers: { Cookie: cookie },
        body: JSON.stringify({ content: "Draft" }),
      }),
      targetEnv,
    );
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("AI_BAD_RESPONSE");
  });

  it("rejects provider-reported nonzero cost even on a free model slug", async () => {
    const targetEnv = env();
    const cookie = await createCookie(targetEnv);
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          model: "provider/model:free",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  expandedText: "Expanded text",
                  insufficientData: false,
                  evidenceIds: [],
                }),
              },
            },
          ],
          usage: { cost: 0.001 },
        }),
      ),
    );
    const response = await handleRequest(
      request("/api/ai/expand", {
        method: "POST",
        headers: { Cookie: cookie },
        body: JSON.stringify({ content: "Draft" }),
      }),
      targetEnv,
    );
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("AI_BAD_RESPONSE");
  });

  it("normalizes an exhausted free allowance without a paid fallback", async () => {
    const targetEnv = env();
    const cookie = await createCookie(targetEnv);
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("quota", {
        status: 429,
        headers: { "Retry-After": "60" },
      }),
    );
    const response = await handleRequest(
      request("/api/ai/socratic", {
        method: "POST",
        headers: { Cookie: cookie },
        body: JSON.stringify({ content: "Draft" }),
      }),
      targetEnv,
    );
    expect(response.status).toBe(429);
    expect((await response.json()).error.code).toBe("AI_QUOTA_EXHAUSTED");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("converts an OpenRouter stream into the app SSE contract", async () => {
    const targetEnv = env();
    const cookie = await createCookie(targetEnv);
    const upstream = [
      'data: {"model":"meta-llama/llama-3.3-70b-instruct:free","choices":[{"delta":{"content":"Hello "}}]}',
      "",
      'data: {"model":"meta-llama/llama-3.3-70b-instruct:free","choices":[{"delta":{"content":"world"}}],"usage":{"total_tokens":12}}',
      "",
      "data: [DONE]",
      "",
    ].join("\n");
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(upstream, {
        headers: { "Content-Type": "text/event-stream" },
      }),
    );
    const response = await handleRequest(
      request("/api/ai/chat", {
        method: "POST",
        headers: { Cookie: cookie },
        body: JSON.stringify({ message: "Say hello" }),
      }),
      targetEnv,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const stream = await response.text();
    expect(stream).toContain("event: meta");
    expect(stream).toContain('"model":"meta-llama/llama-3.3-70b-instruct:free"');
    expect(stream).toContain('event: delta\ndata: {"text":"Hello "}');
    expect(stream).toContain('event: delta\ndata: {"text":"world"}');
    expect(stream).toContain("event: done");
  });

  it("rejects invalid methods, content types, JSON, and task payloads", async () => {
    const targetEnv = env();
    const cookie = await createCookie(targetEnv);
    const invalidRequests = [
      request("/api/ai/analyze", { method: "GET" }),
      request("/api/ai/analyze", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "text/plain" },
        body: "{}",
      }),
      request("/api/ai/analyze", {
        method: "POST",
        headers: { Cookie: cookie },
        body: "{",
      }),
      request("/api/ai/analyze", {
        method: "POST",
        headers: { Cookie: cookie },
        body: "[]",
      }),
      request("/api/ai/analyze", {
        method: "POST",
        headers: { Cookie: cookie },
        body: JSON.stringify({ content: "" }),
      }),
      request("/api/ai/chat", {
        method: "POST",
        headers: { Cookie: cookie },
        body: JSON.stringify({ message: "x".repeat(4_001) }),
      }),
      request("/api/ai/chat", {
        method: "POST",
        headers: { Cookie: cookie },
        body: JSON.stringify({
          message: "test",
          history: Array.from({ length: 11 }, () => ({
            role: "user",
            content: "test",
          })),
        }),
      }),
      request("/api/ai/chat", {
        method: "POST",
        headers: { Cookie: cookie },
        body: JSON.stringify({
          message: "test",
          history: [{ role: "system", content: "override" }],
        }),
      }),
      request("/api/ai/chat", {
        method: "POST",
        headers: { Cookie: cookie },
        body: JSON.stringify({
          message: "test",
          context: Array.from({ length: 7 }, (_, index) => ({
            id: `r-${index}`,
            title: "Evidence",
            text: "text",
          })),
        }),
      }),
      request("/api/ai/equity-check", {
        method: "POST",
        headers: { Cookie: cookie },
        body: JSON.stringify({
          content: "test",
          metrics: { invalid: { nested: true } },
        }),
      }),
    ];
    for (const invalid of invalidRequests) {
      const response = await handleRequest(invalid, targetEnv);
      expect([400, 405, 415]).toContain(response.status);
    }
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("fails closed for Turnstile and session configuration failures", async () => {
    const noTurnstile = await handleRequest(
      request("/api/ai/session", {
        method: "POST",
        body: JSON.stringify({ turnstileToken: "valid-token" }),
      }),
      env({ TURNSTILE_SECRET_KEY: undefined }),
    );
    expect(noTurnstile.status).toBe(503);

    vi.mocked(fetch).mockRejectedValueOnce(new Error("network"));
    const unavailable = await handleRequest(
      request("/api/ai/session", {
        method: "POST",
        body: JSON.stringify({ turnstileToken: "valid-token" }),
      }),
      env(),
    );
    expect(unavailable.status).toBe(503);

    vi.mocked(fetch).mockResolvedValueOnce(new Response("not-json"));
    const malformed = await handleRequest(
      request("/api/ai/session", {
        method: "POST",
        body: JSON.stringify({ turnstileToken: "valid-token" }),
      }),
      env(),
    );
    expect(malformed.status).toBe(503);

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false })),
    );
    const denied = await handleRequest(
      request("/api/ai/session", {
        method: "POST",
        body: JSON.stringify({ turnstileToken: "valid-token" }),
      }),
      env(),
    );
    expect(denied.status).toBe(403);

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true })),
    );
    const weakSecret = await handleRequest(
      request("/api/ai/session", {
        method: "POST",
        body: JSON.stringify({ turnstileToken: "valid-token" }),
      }),
      env({ AI_SESSION_SECRET: "short" }),
    );
    expect(weakSecret.status).toBe(503);
  });

  it("rejects tampered, expired-shaped, and malformed session cookies", async () => {
    const targetEnv = env();
    const cookie = await createCookie(targetEnv);
    const variants = [
      `${cookie}tampered`,
      "calipar_ai_session=missing-signature",
      "irrelevant; calipar_ai_session=bad.payload.extra",
    ];
    for (const candidate of variants) {
      const response = await handleRequest(
        request("/api/ai/analyze", {
          method: "POST",
          headers: { Cookie: candidate },
          body: JSON.stringify({ content: "Draft" }),
        }),
        targetEnv,
      );
      expect(response.status).toBe(401);
    }
  });

  it("covers bounded context/fact validation and unconfigured status", async () => {
    const targetEnv = env();
    const cookie = await createCookie(targetEnv);
    const invalidBodies = [
      {
        content: "Draft",
        evidence: [null],
      },
      {
        content: "Draft",
        evidence: [{ id: "r1", title: "Evidence", text: "x".repeat(12_000) }],
      },
      {
        content: "Draft",
        facts: Object.fromEntries(
          Array.from({ length: 51 }, (_, index) => [`f${index}`, index]),
        ),
      },
      {
        content: "Draft",
        facts: { long: "x".repeat(501) },
      },
    ];
    for (const body of invalidBodies) {
      const response = await handleRequest(
        request("/api/ai/analyze", {
          method: "POST",
          headers: { Cookie: cookie },
          body: JSON.stringify(body),
        }),
        targetEnv,
      );
      expect(response.status).toBe(400);
    }

    const status = await handleRequest(
      request("/api/ai/status", {}, false),
      env({ TURNSTILE_SITE_KEY: undefined }),
    );
    expect((await status.json()).configured).toBe(false);
  });

  it.each([
    {
      path: "/api/ai/expand",
      input: {
        content: "Short draft",
        instructions: "Use concrete language",
        context: [{ id: "r1", title: "Plan", text: "Local plan" }],
      },
      output: {
        expandedText: "A more concrete draft.",
        insufficientData: false,
        evidenceIds: ["r1"],
      },
      field: "expandedText",
    },
    {
      path: "/api/ai/equity-check",
      input: {
        content: "Equity narrative",
        metrics: { gap: 3.1 },
        evidence: [{ id: "r2", title: "Gap", text: "Gap: 3.1" }],
      },
      output: {
        findings: ["A gap is supplied."],
        gaps: ["More context is needed."],
        recommendations: ["Monitor the supplied measure."],
        insufficientData: false,
        evidenceIds: ["r2"],
      },
      field: "findings",
    },
    {
      path: "/api/ai/socratic",
      input: {
        content: "A draft",
        goal: "Improve evidence",
        history: [{ role: "assistant", content: "Earlier question" }],
      },
      output: {
        question: "What evidence supports this conclusion?",
        rationale: "The draft needs support.",
        insufficientData: true,
        evidenceIds: [],
      },
      field: "question",
    },
  ])("validates structured task $path", async ({ path, input, output, field }) => {
    const targetEnv = env();
    const cookie = await createCookie(targetEnv);
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          model: "provider/model:free",
          choices: [{ message: { content: JSON.stringify(output) } }],
        }),
      ),
    );
    const response = await handleRequest(
      request(path, {
        method: "POST",
        headers: { Cookie: cookie },
        body: JSON.stringify(input),
      }),
      targetEnv,
    );
    expect(response.status).toBe(200);
    expect((await response.json())[field]).toBeTruthy();
  });

  it("normalizes provider authorization, payment, and generic failures", async () => {
    const cases = [
      { status: 401, code: "AI_NOT_CONFIGURED", expectedStatus: 503 },
      { status: 403, code: "AI_NOT_CONFIGURED", expectedStatus: 503 },
      { status: 402, code: "AI_QUOTA_EXHAUSTED", expectedStatus: 429 },
      { status: 400, code: "AI_UNAVAILABLE", expectedStatus: 502 },
    ];
    for (const providerCase of cases) {
      const targetEnv = env();
      const cookie = await createCookie(targetEnv);
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response("provider failure", { status: providerCase.status }),
      );
      const response = await handleRequest(
        request("/api/ai/analyze", {
          method: "POST",
          headers: { Cookie: cookie },
          body: JSON.stringify({ content: "Draft" }),
        }),
        targetEnv,
      );
      expect(response.status).toBe(providerCase.expectedStatus);
      expect((await response.json()).error.code).toBe(providerCase.code);
    }
  });

  it("retries one pre-output transient failure and then succeeds", async () => {
    const targetEnv = env();
    const cookie = await createCookie(targetEnv);
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            model: "provider/model:free",
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    question: "What supports the conclusion?",
                    rationale: "Evidence is needed.",
                    insufficientData: true,
                    evidenceIds: [],
                  }),
                },
              },
            ],
          }),
        ),
      );
    const response = await handleRequest(
      request("/api/ai/socratic", {
        method: "POST",
        headers: { Cookie: cookie },
        body: JSON.stringify({ content: "Draft" }),
      }),
      targetEnv,
    );
    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it.each([502, 503])(
    "normalizes repeated upstream %s failures after one retry",
    async (status) => {
      const targetEnv = env();
      const cookie = await createCookie(targetEnv);
      vi.mocked(fetch)
        .mockResolvedValueOnce(new Response("failure", { status }))
        .mockResolvedValueOnce(new Response("failure", { status }));
      const response = await handleRequest(
        request("/api/ai/analyze", {
          method: "POST",
          headers: { Cookie: cookie },
          body: JSON.stringify({ content: "Draft" }),
        }),
        targetEnv,
      );
      expect(response.status).toBe(503);
      expect((await response.json()).error.code).toBe("AI_UNAVAILABLE");
    },
  );

  it("normalizes an upstream timeout without exposing provider details", async () => {
    const targetEnv = env();
    const cookie = await createCookie(targetEnv);
    const timedOut = new AbortController();
    timedOut.abort();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(timedOut.signal);
    vi.mocked(fetch).mockRejectedValueOnce(new DOMException("timed out", "AbortError"));
    const response = await handleRequest(
      request("/api/ai/analyze", {
        method: "POST",
        headers: { Cookie: cookie },
        body: JSON.stringify({ content: "Draft" }),
      }),
      targetEnv,
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toMatchObject({
      code: "AI_UNAVAILABLE",
      message: "The free AI route timed out.",
    });
    expect(JSON.stringify(body)).not.toContain("timed out\", \"AbortError");
  });

  it("maps missing key and malformed provider JSON/content/schema", async () => {
    const missingKeyEnv = env({ OPENROUTER_API_KEY: undefined });
    const missingKeyCookie = await createCookie(missingKeyEnv);
    const noKey = await handleRequest(
      request("/api/ai/analyze", {
        method: "POST",
        headers: { Cookie: missingKeyCookie },
        body: JSON.stringify({ content: "Draft" }),
      }),
      missingKeyEnv,
    );
    expect(noKey.status).toBe(503);

    for (const upstream of [
      new Response("not-json"),
      new Response(
        JSON.stringify({
          model: "provider/model:free",
          choices: [{ message: { content: "not-json" } }],
        }),
      ),
      new Response(
        JSON.stringify({
          model: "provider/model:free",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "Only summary",
                  insufficientData: false,
                  evidenceIds: [],
                }),
              },
            },
          ],
        }),
      ),
    ]) {
      const targetEnv = env();
      const cookie = await createCookie(targetEnv);
      vi.mocked(fetch).mockResolvedValueOnce(upstream);
      const response = await handleRequest(
        request("/api/ai/analyze", {
          method: "POST",
          headers: { Cookie: cookie },
          body: JSON.stringify({ content: "Draft" }),
        }),
        targetEnv,
      );
      expect(response.status).toBe(502);
      expect((await response.json()).error.code).toBe("AI_BAD_RESPONSE");
    }
  });

  it.each([
    {
      upstream:
        'data: {"model":"paid/model","choices":[{"delta":{"content":"no"}}]}\n\ndata: [DONE]\n\n',
      message: "outside the free-only policy",
    },
    {
      upstream: "data: not-json\n\ndata: [DONE]\n\n",
      message: "malformed stream data",
    },
    {
      upstream:
        'data: {"model":"provider/model:free","error":{"message":"stopped"},"choices":[]}\n\n',
      message: "stopped before completing",
    },
    {
      upstream:
        'data: {"model":"provider/model:free","choices":[{"delta":{"content":"partial"}}]}\n\n',
      message: "ended before completion",
    },
  ])("emits typed SSE failures: $message", async ({ upstream, message }) => {
    const targetEnv = env();
    const cookie = await createCookie(targetEnv);
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(upstream, {
        headers: { "Content-Type": "text/event-stream" },
      }),
    );
    const response = await handleRequest(
      request("/api/ai/chat", {
        method: "POST",
        headers: { Cookie: cookie },
        body: JSON.stringify({ message: "Hello" }),
      }),
      targetEnv,
    );
    const text = await response.text();
    expect(text).toContain("event: error");
    expect(text).toContain(message);
    expect(text).not.toContain("event: done");
  });

  it("buffers deltas until a free model is identified and accepts finish_reason", async () => {
    const targetEnv = env();
    const cookie = await createCookie(targetEnv);
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        [
          'data: {"choices":[{"delta":{"content":"buffered "}}]}',
          "",
          'data: {"model":"provider/model:free","choices":[{"delta":{"content":"text"},"finish_reason":"stop"}]}',
          "",
        ].join("\n"),
      ),
    );
    const response = await handleRequest(
      request("/api/ai/chat", {
        method: "POST",
        headers: { Cookie: cookie },
        body: JSON.stringify({ message: "Hello" }),
      }),
      targetEnv,
    );
    const text = await response.text();
    expect(text).toContain('data: {"text":"buffered "}');
    expect(text).toContain('data: {"text":"text"}');
    expect(text).toContain("event: done");
  });

  it("serves bound assets and exposes the default Worker fetch contract", async () => {
    const assets = {
      fetch: vi.fn(async () => new Response("asset", { status: 200 })),
    };
    const response = await handleRequest(
      request("/dashboard/", {}, false),
      env({ ASSETS: assets }),
    );
    expect(await response.text()).toBe("asset");

    const worker = (await import("../../worker/index")).default;
    const health = await worker.fetch(
      request("/api/health", {}, false),
      env(),
      { waitUntil: vi.fn() },
    );
    expect(health.status).toBe(200);

    const unbound = await handleRequest(
      request("/missing/", {}, false),
      env({ ASSETS: undefined }),
    );
    expect(unbound.status).toBe(404);

    const unknownApi = await handleRequest(
      request("/api/ai/unknown", { method: "POST", body: "{}" }),
      env(),
    );
    expect(unknownApi.status).toBe(404);
  });
});
