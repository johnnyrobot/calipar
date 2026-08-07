import { describe, expect, it } from "vitest";

import {
  assertFreeModel,
  assertZeroCost,
  buildUpstreamBody,
  PolicyViolation,
} from "../../worker/policy";

describe("buildUpstreamBody", () => {
  it("cannot be talked out of the free-only, zero-cost, ZDR invariants", () => {
    const body = buildUpstreamBody({
      model: "openai/gpt-4o",
      provider: {
        max_price: { prompt: 100, completion: 100, request: 100 },
        data_collection: "allow",
        zdr: false,
        allow_fallbacks: false,
      },
      messages: [{ role: "user", content: "hello" }],
    });

    expect(body.model).toBe("openrouter/free");
    expect(body.provider).toEqual({
      allow_fallbacks: true,
      max_price: { prompt: 0, completion: 0, request: 0 },
      data_collection: "deny",
      zdr: true,
    });
  });

  it("keeps worker-authored provider fields that are not invariants", () => {
    const body = buildUpstreamBody({
      provider: { require_parameters: true },
    });

    expect(body.provider).toEqual({
      require_parameters: true,
      allow_fallbacks: true,
      max_price: { prompt: 0, completion: 0, request: 0 },
      data_collection: "deny",
      zdr: true,
    });
  });

  it("passes every other payload field through untouched", () => {
    const messages = [{ role: "user", content: "hello" }];
    const body = buildUpstreamBody({
      stream: true,
      max_tokens: 700,
      messages,
      response_format: { type: "json_schema" },
    });

    expect(body.stream).toBe(true);
    expect(body.max_tokens).toBe(700);
    expect(body.messages).toBe(messages);
    expect(body.response_format).toEqual({ type: "json_schema" });
  });

  it("still applies the provider invariants when the payload has no provider", () => {
    const body = buildUpstreamBody({ stream: false });

    expect(body.provider).toEqual({
      allow_fallbacks: true,
      max_price: { prompt: 0, completion: 0, request: 0 },
      data_collection: "deny",
      zdr: true,
    });
  });

  it("ignores a non-object provider rather than spreading it", () => {
    const body = buildUpstreamBody({ provider: "not-an-object" });

    expect(body.provider).toEqual({
      allow_fallbacks: true,
      max_price: { prompt: 0, completion: 0, request: 0 },
      data_collection: "deny",
      zdr: true,
    });
  });
});

describe("assertFreeModel", () => {
  it("accepts the pinned free router and any :free variant", () => {
    expect(() => assertFreeModel("openrouter/free")).not.toThrow();
    expect(() => assertFreeModel("google/gemma-3-27b-it:free")).not.toThrow();
  });

  it("rejects a paid model", () => {
    expect(() => assertFreeModel("openai/gpt-4o")).toThrow(PolicyViolation);
  });

  it("rejects a missing or non-string model", () => {
    expect(() => assertFreeModel(undefined)).toThrow(PolicyViolation);
    expect(() => assertFreeModel(null)).toThrow(PolicyViolation);
    expect(() => assertFreeModel(42)).toThrow(PolicyViolation);
  });

  it("rejects a model that only mentions ':free' somewhere in the middle", () => {
    expect(() => assertFreeModel("vendor/:free-but-not-really")).toThrow(
      PolicyViolation,
    );
  });
});

describe("assertZeroCost", () => {
  it("accepts usage the provider did not bill", () => {
    expect(() => assertZeroCost(undefined)).not.toThrow();
    expect(() => assertZeroCost({})).not.toThrow();
    expect(() => assertZeroCost({ cost: 0 })).not.toThrow();
    expect(() => assertZeroCost({ prompt_tokens: 10 })).not.toThrow();
  });

  it("rejects any positive reported cost, however small", () => {
    expect(() => assertZeroCost({ cost: 0.0001 })).toThrow(PolicyViolation);
  });

  it("refuses a cost it cannot read as a number", () => {
    // The check used to be `typeof cost === "number" && cost > 0`, so a
    // provider reporting `{"cost": "0.02"}` as a string passed straight
    // through. The demo cannot confirm that request was free, so the honest
    // answer is to refuse it rather than to assume zero.
    expect(() => assertZeroCost({ cost: "0.02" })).toThrow(PolicyViolation);
    expect(() => assertZeroCost({ cost: "0" })).toThrow(PolicyViolation);
    expect(() => assertZeroCost({ cost: {} })).toThrow(PolicyViolation);
    expect(() => assertZeroCost({ cost: Number.NaN })).toThrow(PolicyViolation);
  });

  it("still accepts the shapes a free route actually reports", () => {
    // `null` is a real thing providers send for "no cost recorded", and must
    // not be swept up by the stricter rule above.
    expect(() => assertZeroCost({ cost: null })).not.toThrow();
    expect(() => assertZeroCost({ cost: undefined })).not.toThrow();
  });
});
