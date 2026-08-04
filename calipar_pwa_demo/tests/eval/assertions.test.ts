import { describe, expect, it } from "vitest";

import {
  assertEvidenceInAllowlist,
  assertNoSecretsInResponse,
  assertNumbersGrounded,
  assertSchemaValid,
  ungroundedNumbers,
} from "./assertions";

describe("assertNumbersGrounded", () => {
  it("accepts figures that appear in the supplied evidence", () => {
    expect(
      ungroundedNumbers("Success was 812 of 1,004.", ["812 successful of 1,004 attempted"]),
    ).toEqual([]);
  });

  it("flags a figure that appears nowhere in the evidence", () => {
    expect(
      ungroundedNumbers("Success was 950 of 1,004.", ["812 successful of 1,004 attempted"]),
    ).toEqual(["950"]);
  });

  it("normalises thousands separators before comparing", () => {
    expect(ungroundedNumbers("1004 attempts", ["1,004 attempted"])).toEqual([]);
  });

  it("flags a bare percentage with no denominator in the evidence", () => {
    // CONTEXT.md: a rate is always reported with both of its counts, because the
    // denominator is what makes an equity claim readable.
    expect(ungroundedNumbers("Success was 81%.", ["812 successful of 1,004 attempted"])).toEqual([
      "81",
    ]);
  });

  it("throws with the offending figures listed", () => {
    expect(() => assertNumbersGrounded("Success was 950.", ["812 of 1,004"])).toThrow(/950/);
  });

  it("does not throw when everything traces", () => {
    expect(() => assertNumbersGrounded("812 of 1,004.", ["812 of 1,004"])).not.toThrow();
  });
});

describe("assertEvidenceInAllowlist", () => {
  it("passes when every id was supplied", () => {
    expect(() => assertEvidenceInAllowlist({ evidenceIds: ["a"] }, ["a", "b"])).not.toThrow();
  });

  it("throws when an id was invented", () => {
    expect(() => assertEvidenceInAllowlist({ evidenceIds: ["z"] }, ["a"])).toThrow(/z/);
  });

  it("treats a missing evidenceIds field as citing nothing", () => {
    expect(() => assertEvidenceInAllowlist({}, [])).not.toThrow();
  });
});

describe("assertSchemaValid", () => {
  it("accepts a well-formed analyze response", () => {
    expect(() =>
      assertSchemaValid("analyze", {
        insufficientData: false,
        evidenceIds: [],
        summary: "s",
        strengths: [],
        concerns: [],
        recommendations: [],
      }),
    ).not.toThrow();
  });

  it("rejects a non-boolean insufficientData", () => {
    expect(() => assertSchemaValid("analyze", { insufficientData: "no", evidenceIds: [] })).toThrow(
      /insufficientData/,
    );
  });

  it("rejects a missing evidenceIds array", () => {
    expect(() => assertSchemaValid("analyze", { insufficientData: false })).toThrow(/evidenceIds/);
  });

  it("names the missing task-specific field", () => {
    expect(() =>
      assertSchemaValid("socratic", { insufficientData: false, evidenceIds: [], question: "q" }),
    ).toThrow(/rationale/);
  });
});

describe("assertNoSecretsInResponse", () => {
  it("passes on a clean response", () => {
    expect(() => assertNoSecretsInResponse({ json: { summary: "fine" } })).not.toThrow();
  });

  it("throws when a configured secret appears in JSON", () => {
    expect(() =>
      assertNoSecretsInResponse({ json: { summary: "key is eval-openrouter-key" } }),
    ).toThrow(/leaked/i);
  });

  it("throws when a configured secret appears in an SSE transcript", () => {
    expect(() =>
      assertNoSecretsInResponse({ sse: "event: delta\ndata: {\"text\":\"eval-turnstile-secret\"}" }),
    ).toThrow(/leaked/i);
  });
});
