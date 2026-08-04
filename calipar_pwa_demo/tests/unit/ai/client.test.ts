import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AIClientError,
  analyze,
  createAISession,
  equityCheck,
  expand,
  getAIStatus,
  socratic,
  streamChat,
} from "../../../lib/ai/client";

describe("AI browser client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses same-origin credentialed requests", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          configured: true,
          freeOnly: true,
          zeroDataRetention: true,
          dataCollection: "deny",
          sessionRequired: true,
          turnstileSiteKey: "site-key",
        }),
      ),
    );
    await getAIStatus();
    expect(fetch).toHaveBeenCalledWith(
      "/api/ai/status",
      expect.objectContaining({
        credentials: "include",
        cache: "no-store",
      }),
    );

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, expiresIn: 1800 })),
    );
    await createAISession("turnstile-token");
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/ai/session",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ turnstileToken: "turnstile-token" }),
      }),
    );
  });

  it("surfaces typed Worker errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: "AI_QUOTA_EXHAUSTED",
            message: "Free allowance exhausted.",
            requestId: "request-1",
            retryAfter: 60,
          },
        }),
        { status: 429 },
      ),
    );
    const error = await analyze({ content: "Draft" }).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(AIClientError);
    expect(error).toMatchObject({
      code: "AI_QUOTA_EXHAUSTED",
      requestId: "request-1",
      retryAfter: 60,
      status: 429,
    });
  });

  it("parses meta, delta, and done SSE events", async () => {
    const stream = [
      'event: meta\ndata: {"requestId":"r1","model":"model:free"}',
      "",
      'event: delta\ndata: {"text":"First "}',
      "",
      'event: delta\ndata: {"text":"second"}',
      "",
      'event: done\ndata: {"requestId":"r1","model":"model:free"}',
      "",
    ].join("\n");
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(stream, {
        headers: { "Content-Type": "text/event-stream" },
      }),
    );
    const deltas: string[] = [];
    const result = await streamChat(
      { message: "Hello" },
      { onDelta: (text) => deltas.push(text) },
    );
    expect(deltas).toEqual(["First ", "second"]);
    expect(result).toEqual({ requestId: "r1", model: "model:free" });
  });

  it("turns an SSE error event into AIClientError", async () => {
    const stream = [
      'event: error\ndata: {"code":"AI_UNAVAILABLE","message":"Interrupted","requestId":"r2"}',
      "",
    ].join("\n");
    vi.mocked(fetch).mockResolvedValueOnce(new Response(stream));
    await expect(streamChat({ message: "Hello" })).rejects.toMatchObject({
      name: "AIClientError",
      code: "AI_UNAVAILABLE",
      requestId: "r2",
    });
  });

  it("uses a safe typed fallback for non-JSON HTTP failures", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("gateway failure", { status: 502 }),
    );
    await expect(getAIStatus()).rejects.toMatchObject({
      name: "AIClientError",
      code: "AI_UNAVAILABLE",
      status: 502,
      message: "The AI service is temporarily unavailable.",
    });
  });

  it("calls every structured endpoint and returns its JSON contract", async () => {
    const responses = [
      {
        expandedText: "Expanded",
        insufficientData: false,
        evidenceIds: [],
        meta: { requestId: "r1", model: "model:free" },
      },
      {
        findings: [],
        gaps: [],
        recommendations: [],
        insufficientData: true,
        evidenceIds: [],
        meta: { requestId: "r2", model: "model:free" },
      },
      {
        question: "What evidence supports this?",
        rationale: "Evidence is needed.",
        insufficientData: true,
        evidenceIds: [],
        meta: { requestId: "r3", model: "model:free" },
      },
    ];
    for (const value of responses) {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(value)),
      );
    }

    await expect(expand({ content: "Draft" })).resolves.toMatchObject({
      expandedText: "Expanded",
    });
    await expect(
      equityCheck({ content: "Draft" }),
    ).resolves.toHaveProperty("findings");
    await expect(socratic({ content: "Draft" })).resolves.toHaveProperty(
      "question",
    );
    expect(vi.mocked(fetch).mock.calls.map(([path]) => path)).toEqual([
      "/api/ai/expand",
      "/api/ai/equity-check",
      "/api/ai/socratic",
    ]);
  });

  it("rejects a successful stream with no body", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );
    await expect(streamChat({ message: "Hello" })).rejects.toMatchObject({
      code: "AI_BAD_RESPONSE",
      message: "The AI stream did not include a response body.",
    });
  });

  it("rejects malformed SSE JSON and an incomplete stream", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response("event: delta\ndata: not-json\n\n"),
      )
      .mockResolvedValueOnce(
        new Response('event: delta\ndata: {"text":"partial"}\n\n'),
      );
    await expect(streamChat({ message: "Hello" })).rejects.toMatchObject({
      code: "AI_BAD_RESPONSE",
      message: "The AI stream returned malformed data.",
    });
    await expect(streamChat({ message: "Hello" })).rejects.toMatchObject({
      code: "AI_BAD_RESPONSE",
      message: "The AI stream ended before completion.",
    });
  });

  it("parses a final SSE event without a trailing newline", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        'event: done\ndata: {"requestId":"last","model":"model:free"}',
      ),
    );
    await expect(streamChat({ message: "Hello" })).resolves.toEqual({
      requestId: "last",
      model: "model:free",
    });
  });

  it("aborts a stream that never terminates a line", async () => {
    // No newline is ever emitted, so `buffer` grows without bound. Without a
    // cap this test hangs; with one it rejects in milliseconds.
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new TextEncoder().encode("x".repeat(8192)));
      },
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(endless, { headers: { "Content-Type": "text/event-stream" } }),
    );
    await expect(streamChat({ message: "hi", history: [], context: [] })).rejects.toMatchObject(
      { code: "AI_BAD_RESPONSE", message: "The AI response exceeded its size limit." },
    );
  });

  it("aborts a stream whose aggregate size exceeds the ceiling", async () => {
    // Every chunk is newline-terminated, so the per-line ceiling never fires;
    // only the aggregate cap can stop this one.
    const line = `${"y".repeat(4096)}\n`;
    const flood = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new TextEncoder().encode(line));
      },
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(flood, { headers: { "Content-Type": "text/event-stream" } }),
    );
    await expect(streamChat({ message: "hi" })).rejects.toMatchObject({
      code: "AI_BAD_RESPONSE",
      message: "The AI response exceeded its size limit.",
    });
  });
});
