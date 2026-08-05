import { describe, expect, it } from "vitest";

import { AI_LIMITS } from "@/lib/ai/contracts";

// Worst case for a byte-pair tokenizer on prose: a token rarely exceeds four
// characters. Deliberately pessimistic — the point is a floor that holds
// without anyone re-measuring a provider's tokenizer.
const WORST_CASE_CHARS_PER_TOKEN = 4;

describe("AI_LIMITS internal consistency", () => {
  // Regression guard for the wedged-thread bug: `historyMessageCharacters` was
  // 2_000 while chat generated up to 700 tokens (~2_800 characters). A reply
  // longer than the history ceiling is stored locally, resent as history on the
  // next turn, and rejected by the Worker — permanently, because sending is
  // what would push it out of the client's window. Reset was the only recovery.
  //
  // These two numbers are coupled and live far apart in the code, so the
  // coupling has to be asserted rather than remembered.
  it("accepts as history the longest reply generation can produce", () => {
    const longestPossibleReply =
      AI_LIMITS.chatMaxTokens * WORST_CASE_CHARS_PER_TOKEN;

    expect(AI_LIMITS.historyMessageCharacters).toBeGreaterThanOrEqual(
      longestPossibleReply,
    );
  });

  // The same reply also has to survive the round trip as a whole request: a
  // full history window plus context plus prompt must fit under the body
  // ceiling, or the wedge reappears one layer up as a 413 instead of a 400.
  //
  // Compares characters against a byte ceiling, so it holds for ASCII and is
  // optimistic for multibyte text. That is a pre-existing property of the two
  // limits, not something this test introduces — it is a floor, not a proof.
  it("fits a full history window, context, and prompt under the body ceiling", () => {
    const worstCaseCharacters =
      AI_LIMITS.historyMessages * AI_LIMITS.historyMessageCharacters +
      AI_LIMITS.contextCharacters +
      AI_LIMITS.promptCharacters;

    expect(worstCaseCharacters).toBeLessThan(AI_LIMITS.bodyBytes);
  });
});
