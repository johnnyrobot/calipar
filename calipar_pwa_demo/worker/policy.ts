// The free-route policy: the demo's central safety claim, in one place.
//
// The claim is that a visitor's request can only ever reach a free, zero-cost,
// zero-data-retention route. It has two halves and both live here:
//
//   Request side  — `buildUpstreamBody` writes the invariants last, so no caller
//                   payload can override them. Correct by construction.
//   Response side — `assertFreeModel` / `assertZeroCost` re-check what the
//                   provider says it did. They only catch a breach after it is
//                   billed, which is why the request side cannot rely on them.
//
// This module throws `PolicyViolation`, never `ApiError`: `ApiError` is private
// to the router, and importing nothing from it is what keeps the policy
// directly testable without a signed cookie or a `fetch` stub.

type JsonRecord = Record<string, unknown>;

/** The only model the demo ever asks for. */
const FREE_ROUTE_MODEL = "openrouter/free";

export class PolicyViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PolicyViolation";
  }
}

function isObject(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFreeModel(model: unknown): model is string {
  return (
    typeof model === "string" &&
    (model === FREE_ROUTE_MODEL || model.endsWith(":free"))
  );
}

/**
 * Merge a worker-authored payload with the policy invariants.
 *
 * The caller's fields are spread FIRST and the invariants written last, so
 * `model`, `max_price`, `data_collection` and `zdr` cannot be overridden by
 * anything a payload carries. Worker-authored provider fields that are not
 * invariants — `require_parameters`, say — survive the merge.
 *
 * Every call site today is worker-authored, so nothing can currently exploit
 * the other ordering. This is the guarantee for the passthrough field nobody
 * has written yet.
 */
export function buildUpstreamBody(payload: JsonRecord): JsonRecord {
  const { provider: callerProvider, ...rest } = payload;
  return {
    ...rest,
    model: FREE_ROUTE_MODEL,
    provider: {
      ...(isObject(callerProvider) ? callerProvider : {}),
      allow_fallbacks: true,
      max_price: { prompt: 0, completion: 0, request: 0 },
      data_collection: "deny",
      zdr: true,
    },
  };
}

/**
 * Model acceptance. A provider that answers on anything but a free route has
 * breached the policy regardless of what it charged, so this rejects a missing
 * or non-string model too. Callers that legitimately have no model yet — SSE
 * chunks before the first `model` field — must guard before calling.
 */
export function assertFreeModel(model: unknown): asserts model is string {
  if (!isFreeModel(model)) {
    throw new PolicyViolation(
      "The AI provider selected a model outside the free-only policy.",
    );
  }
}

/**
 * Usage acceptance. A free route reports no cost; any positive reported cost
 * means the request was billed, which the demo must never do.
 *
 * A `cost` that is present but not a finite number is refused rather than
 * ignored. The earlier rule was `typeof cost === "number" && cost > 0`, which
 * let `{"cost": "0.02"}` through as a string — the one shape where the demo
 * genuinely cannot tell whether it was billed. Absent and `null` still pass:
 * those mean "no cost recorded", which a free route legitimately reports.
 */
export function assertZeroCost(usage: unknown): void {
  if (!isObject(usage)) return;
  const cost = usage.cost;
  if (cost === undefined || cost === null) return;
  if (typeof cost !== "number" || !Number.isFinite(cost)) {
    throw new PolicyViolation(
      "The AI provider reported a usage cost the demo could not verify as zero.",
    );
  }
  if (cost > 0) {
    throw new PolicyViolation(
      "The AI provider reported usage outside the zero-cost policy.",
    );
  }
}
