import { describe, expect, it } from "vitest";

import { deltaText, runCase } from "./harness";

describe("eval harness", () => {
  it("replays a cassette through the real Worker and returns the app response", async () => {
    const outcome = await runCase({
      name: "smoke",
      task: "analyze",
      cassette: "analyze-grounded",
      body: {
        content: "Summarise the biology programme outcomes.",
        evidence: [
          {
            id: "analytics-biology-2025",
            title: "Biology 2025",
            text: "Course success 812 of 1,004.",
          },
        ],
      },
    });
    expect(outcome.status).toBe(200);
    expect(outcome.json?.insufficientData).toBe(false);
    expect(outcome.allowedEvidence).toEqual(["analytics-biology-2025"]);
    expect(outcome.json?.evidenceIds).toEqual(["analytics-biology-2025"]);
  });

  it("replays a streaming cassette and reassembles the delivered prose", async () => {
    const outcome = await runCase({
      name: "smoke-chat",
      task: "chat",
      cassette: "chat-grounded",
      body: {
        message: "How did course success look?",
        history: [],
        context: [
          {
            id: "analytics-biology-2025",
            title: "Biology 2025",
            text: "Course success 812 of 1,004.",
          },
        ],
      },
    });
    expect(outcome.status).toBe(200);
    expect(outcome.sse).toContain("event: done");
    expect(deltaText(outcome.sse!)).toContain("812 of 1,004");
  });

  it("constructs the upstream call itself, with the free-only policy fixed", async () => {
    const outcome = await runCase({
      name: "smoke-policy",
      task: "analyze",
      cassette: "analyze-grounded",
      body: { content: "Summarise.", evidence: [] },
    });
    expect(outcome.status).toBe(200);
    expect(outcome.upstreamBody.model).toBe("openrouter/free");
    expect(outcome.upstreamBody.provider).toMatchObject({
      max_price: { prompt: 0, completion: 0, request: 0 },
      data_collection: "deny",
      zdr: true,
    });
  });
});
