import { EVAL_SECRETS } from "./harness";

const NUMBER = /\d[\d,]*(?:\.\d+)?/g;

function normalise(value: string): string {
  return value.replace(/,/g, "").replace(/\.0+$/, "");
}

/**
 * Every figure the model states must trace back to a supplied one.
 *
 * A bare percentage is ungrounded unless the same digits appear in the
 * evidence: `CONTEXT.md` defines a Rate as always reported with both of its
 * counts, "because the denominator is what makes an equity claim readable".
 * A model that turns "812 of 1,004" into "81%" has dropped the thing that made
 * the claim checkable, so the percentage is treated as invented.
 */
export function ungroundedNumbers(text: string, supplied: string[]): string[] {
  const allowed = new Set<string>();
  for (const item of supplied) {
    for (const match of item.matchAll(NUMBER)) allowed.add(normalise(match[0]));
  }
  const offending: string[] = [];
  for (const match of text.matchAll(NUMBER)) {
    const value = normalise(match[0]);
    if (!allowed.has(value)) offending.push(value);
  }
  return offending;
}

export function assertNumbersGrounded(text: string, supplied: string[]): void {
  const offending = ungroundedNumbers(text, supplied);
  if (offending.length > 0) {
    throw new Error(
      `Response states figures absent from the supplied evidence: ${offending.join(", ")}`,
    );
  }
}

export function assertEvidenceInAllowlist(
  json: Record<string, unknown>,
  allowlist: string[],
): void {
  const ids = Array.isArray(json.evidenceIds) ? (json.evidenceIds as string[]) : [];
  const invented = ids.filter((id) => !allowlist.includes(id));
  if (invented.length > 0) {
    throw new Error(
      `Response cited evidence identifiers that were never supplied: ${invented.join(", ")}`,
    );
  }
}

const REQUIRED_FIELDS: Record<string, string[]> = {
  analyze: ["summary", "strengths", "concerns", "recommendations"],
  expand: ["expandedText"],
  "equity-check": ["findings", "gaps", "recommendations"],
  socratic: ["question", "rationale"],
};

/** Mirrors validateStructuredResult from the outside, so a change there is visible here. */
export function assertSchemaValid(task: string, json: Record<string, unknown>): void {
  if (typeof json.insufficientData !== "boolean") {
    throw new Error(`${task}: insufficientData must be a boolean`);
  }
  if (!Array.isArray(json.evidenceIds)) {
    throw new Error(`${task}: evidenceIds must be an array`);
  }
  for (const field of REQUIRED_FIELDS[task] ?? []) {
    if (json[field] === undefined) throw new Error(`${task}: missing required field ${field}`);
  }
}

/** The one assertion that must never be relaxed. */
export function assertNoSecretsInResponse(outcome: { json?: unknown; sse?: string }): void {
  const haystack = `${JSON.stringify(outcome.json ?? {})}${outcome.sse ?? ""}`;
  for (const secret of EVAL_SECRETS) {
    if (haystack.includes(secret)) {
      throw new Error(`Response leaked a configured secret value (${secret}).`);
    }
  }
}

/**
 * Every case is also a free-only/ZDR regression test: the browser cannot
 * influence the upstream call, so the Worker must construct it the same way
 * every time.
 */
export function assertFreeOnlyPolicy(upstreamBody: Record<string, unknown>): void {
  if (upstreamBody.model !== "openrouter/free") {
    throw new Error(`Upstream request asked for ${String(upstreamBody.model)}, not openrouter/free`);
  }
  const provider = upstreamBody.provider as Record<string, unknown> | undefined;
  const price = provider?.max_price as Record<string, unknown> | undefined;
  if (
    price?.prompt !== 0 ||
    price?.completion !== 0 ||
    price?.request !== 0 ||
    provider?.data_collection !== "deny" ||
    provider?.zdr !== true
  ) {
    throw new Error("Upstream request did not carry the zero-price, no-collection, ZDR policy");
  }
}
