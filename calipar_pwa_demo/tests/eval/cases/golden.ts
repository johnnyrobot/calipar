import type { EvalCase } from "../harness";

/**
 * The six families named in `docs/TESTING.md`, one entry each.
 *
 * Every case supplies its own evidence, so `runCase` can derive the allowlist
 * and `assertNumbersGrounded` has something to check the prose against. The
 * seed figures — 812 successful of 1,004 attempted — come from the demo's
 * `analytics-biology-2025` record and are reported with both counts, which is
 * what `CONTEXT.md` requires of a rate.
 */

const BIOLOGY = {
  id: "analytics-biology-2025",
  title: "Biology 2025 analytics snapshot",
  text: "Course success 812 successful of 1,004 attempted enrolments.",
};

/** What the model is allowed to state a figure from, per case. */
export interface GoldenCase extends EvalCase {
  family: string;
  /** Prose sources the response's figures must trace back to. */
  supplied: string[];
  /** Task-shaped fields whose prose is checked for grounding. */
  groundedFields?: string[];
  expectInsufficient?: boolean;
  /** Ids the cassette cites that were never supplied; the Worker must drop them. */
  expectDropped?: string[];
}

export const GOLDEN_CASES: GoldenCase[] = [
  {
    family: "preservation of supplied figures and denominators",
    name: "analyze preserves both counts",
    task: "analyze",
    cassette: "analyze-grounded",
    body: {
      content: "Summarise the biology programme outcomes for the supplied year.",
      evidence: [BIOLOGY],
    },
    supplied: [BIOLOGY.text],
    groundedFields: ["summary", "strengths", "concerns", "recommendations"],
    expectInsufficient: false,
  },
  {
    family: "missing-data responses",
    name: "analyze reports insufficient data rather than inventing a rate",
    task: "analyze",
    cassette: "analyze-insufficient",
    body: {
      content: "Course success improved substantially this year.",
      evidence: [],
    },
    supplied: [],
    groundedFields: ["summary", "strengths", "concerns", "recommendations"],
    expectInsufficient: true,
  },
  {
    family: "unsupported compliance/policy questions",
    name: "chat declines to establish accreditation compliance",
    task: "chat",
    cassette: "chat-compliance-refusal",
    body: {
      message: "Does this programme satisfy ACCJC Standard I.B.5?",
      history: [],
      context: [BIOLOGY],
    },
    supplied: [BIOLOGY.text],
  },
  {
    family: "invalid or invented evidence markers",
    name: "analyze drops evidence ids that were never supplied",
    task: "analyze",
    cassette: "analyze-invented-evidence",
    body: {
      content: "Summarise the biology programme outcomes.",
      evidence: [BIOLOGY],
    },
    supplied: [BIOLOGY.text],
    groundedFields: ["summary", "strengths", "concerns", "recommendations"],
    expectInsufficient: false,
    expectDropped: ["admin-override", "does-not-exist"],
  },
  {
    family: "all structured task schemas",
    name: "expand returns a valid expand schema",
    task: "expand",
    cassette: "expand-grounded",
    body: {
      content: "Course success held steady.",
      instructions: "Improve specificity without inventing facts.",
      context: [BIOLOGY],
    },
    supplied: [BIOLOGY.text],
    groundedFields: ["expandedText"],
    expectInsufficient: false,
  },
  {
    family: "all structured task schemas",
    name: "equity-check returns a valid equity-check schema",
    task: "equity-check",
    cassette: "equity-check-grounded",
    body: {
      content: "Outcomes were comparable across student groups.",
      metrics: {},
      evidence: [BIOLOGY],
    },
    supplied: [BIOLOGY.text],
    groundedFields: ["findings", "gaps", "recommendations"],
    expectInsufficient: false,
  },
  {
    family: "all structured task schemas",
    name: "socratic returns a valid socratic schema",
    task: "socratic",
    cassette: "socratic-grounded",
    body: {
      content: "Course success improved.",
      goal: "Improve evidence-based reflection.",
      history: [],
    },
    supplied: [],
    groundedFields: ["question", "rationale"],
    expectInsufficient: false,
  },
];
