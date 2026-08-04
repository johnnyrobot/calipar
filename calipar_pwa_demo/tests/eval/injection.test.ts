import { describe, expect, it } from "vitest";

import { assertNoSecretsInResponse, assertSchemaValid } from "./assertions";
import { INJECTION_CASES } from "./cases/injection";
import { deltaText, runCase } from "./harness";

describe("AI prompt-injection corpus", () => {
  it.each(INJECTION_CASES.map((c) => [c.name, c] as const))("%s", async (_name, testCase) => {
    const outcome = await runCase(testCase);

    if (testCase.expectStatus !== undefined) {
      expect(outcome.status).toBe(testCase.expectStatus);
    }

    // The assertion that must never be relaxed, on every case regardless of
    // status: no configured secret may appear in anything the browser receives.
    assertNoSecretsInResponse(outcome);

    if (outcome.status !== 200) return;

    if (testCase.task === "chat") {
      expect(deltaText(outcome.sse!).length).toBeGreaterThan(0);
      return;
    }

    const json = outcome.json!;
    // A hostile provider response that survives must still be well-formed.
    assertSchemaValid(testCase.task, json);
    for (const dropped of testCase.mustDrop ?? []) {
      if (outcome.allowedEvidence.includes(dropped)) continue;
      expect(json.evidenceIds).not.toContain(dropped);
    }
  });

  it("returns hostile model prose as data, never as a markup-bearing content type", async () => {
    const chat = INJECTION_CASES.find((c) => c.cassette === "chat-injection-compliant")!;
    const outcome = await runCase(chat);
    const prose = deltaText(outcome.sse!);
    // The Worker does not sanitise prose — that is the renderer's job — but it
    // must never hand it back in a form a browser would execute.
    expect(prose).toContain("<img src=x");
    expect(outcome.sse).not.toContain("text/html");
  });

  it("never puts a configured secret where the model could learn it", async () => {
    // The real defence against the exfiltration injection is upstream of the
    // model: the key travels in the Authorization header, never in the prompt,
    // so there is nothing for the model to reveal. A provider that claims to
    // print the key is bluffing, and the cassette says so with a placeholder.
    const chat = INJECTION_CASES.find((c) => c.cassette === "chat-injection-compliant")!;
    const outcome = await runCase(chat);
    const sent = JSON.stringify(outcome.upstreamBody);
    for (const secret of ["eval-openrouter-key", "eval-session-secret", "eval-turnstile-secret"]) {
      expect(sent).not.toContain(secret);
      expect(outcome.sse).not.toContain(secret);
    }
  });

  it("does not send the workspace beyond the records the request selected", async () => {
    const analyze = INJECTION_CASES[0]!;
    const outcome = await runCase(analyze);
    const messages = outcome.upstreamBody.messages as Array<{ content: string }>;
    const sent = messages.map((m) => m.content).join("\n");
    expect(sent).toContain("imported-forgedEvidence");
    expect(sent).not.toContain("review-biology-2025");
    expect(sent).not.toContain("eval-openrouter-key");
  });
});
