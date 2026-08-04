import { describe, expect, it } from "vitest";

import {
  assertEvidenceInAllowlist,
  assertFreeOnlyPolicy,
  assertNoSecretsInResponse,
  assertNumbersGrounded,
  assertSchemaValid,
} from "./assertions";
import { GOLDEN_CASES } from "./cases/golden";
import { deltaText, runCase } from "./harness";

/** Collect the prose a structured field carries, whether string or string[]. */
function proseOf(json: Record<string, unknown>, fields: string[]): string {
  return fields
    .map((field) => {
      const value = json[field];
      if (typeof value === "string") return value;
      if (Array.isArray(value)) return value.filter((v) => typeof v === "string").join(" ");
      return "";
    })
    .join(" ");
}

describe("AI golden set", () => {
  it.each(GOLDEN_CASES.map((c) => [c.name, c] as const))("%s", async (_name, testCase) => {
    const outcome = await runCase(testCase);
    expect(outcome.status).toBe(200);

    // Every case is also a free-only/ZDR regression test: the browser cannot
    // influence the upstream call, so the Worker must build it the same way.
    assertFreeOnlyPolicy(outcome.upstreamBody);
    assertNoSecretsInResponse(outcome);

    if (testCase.task === "chat") {
      const prose = deltaText(outcome.sse!);
      expect(prose.length).toBeGreaterThan(0);
      assertNumbersGrounded(prose, testCase.supplied);
      return;
    }

    const json = outcome.json!;
    assertSchemaValid(testCase.task, json);
    assertEvidenceInAllowlist(json, outcome.allowedEvidence);

    if (testCase.expectInsufficient !== undefined) {
      expect(json.insufficientData).toBe(testCase.expectInsufficient);
    }
    if (testCase.groundedFields) {
      assertNumbersGrounded(proseOf(json, testCase.groundedFields), testCase.supplied);
    }
    for (const dropped of testCase.expectDropped ?? []) {
      expect(json.evidenceIds).not.toContain(dropped);
    }
  });

  it("covers every family documented in docs/TESTING.md", () => {
    const families = new Set(GOLDEN_CASES.map((c) => c.family));
    expect(families).toContain("preservation of supplied figures and denominators");
    expect(families).toContain("missing-data responses");
    expect(families).toContain("unsupported compliance/policy questions");
    expect(families).toContain("invalid or invented evidence markers");
    expect(families).toContain("all structured task schemas");
  });

  it("declines to establish accreditation compliance", async () => {
    const compliance = GOLDEN_CASES.find((c) => c.cassette === "chat-compliance-refusal")!;
    const prose = deltaText((await runCase(compliance)).sse!);
    expect(prose).toMatch(/cannot establish|not an authoritative/i);
    expect(prose).not.toMatch(/\b(meets|satisfies|complies with) (the )?standard/i);
  });
});
