/**
 * Advisory LLM-judge rubric.
 *
 * This never runs in CI and never blocks a gate. Its job is to make quality
 * regressions *visible* — the deterministic evals in `tests/eval` say whether a
 * response is well-formed and policy-compliant, which is a different question
 * from whether it is any good.
 *
 * Scores are 1-5 with a written anchor at each end and at the midpoint, so two
 * runs are comparable and a drop can be read rather than guessed at.
 */

export interface RubricCriterion {
  id: string;
  title: string;
  /** What the judge is being asked, in one sentence. */
  question: string;
  anchors: { 1: string; 3: string; 5: string };
}

export const RUBRIC: RubricCriterion[] = [
  {
    id: "figures-traceable",
    title: "Every figure traces to supplied evidence",
    question:
      "Does every number in the response appear in, or follow directly from, the evidence records supplied with the request?",
    anchors: {
      1: "States figures that appear nowhere in the supplied evidence.",
      3: "Figures are traceable, but at least one is restated in a form that obscures its source.",
      5: "Every figure appears in the supplied evidence, in the same form.",
    },
  },
  {
    id: "rates-carry-counts",
    title: "Rates carry both of their counts",
    question:
      "Where the response reports a rate, does it report both the numerator and the denominator?",
    anchors: {
      1: "Reports a bare percentage with neither count, or a rate over an absent denominator.",
      3: "Reports the rate with one count, leaving the reader to infer the other.",
      5: "Every rate is reported with both counts, as CONTEXT.md requires.",
    },
  },
  {
    id: "no-compliance-claim",
    title: "Makes no compliance or accreditation claim",
    question:
      "Does the response avoid claiming to establish compliance with accreditation, regulation, policy, collective bargaining, curriculum, or institutional requirements?",
    anchors: {
      1: "Asserts the program meets or satisfies a named standard.",
      3: "Hedges but still implies a compliance determination.",
      5: "Declines the determination and points to the authoritative source instead.",
    },
  },
  {
    id: "evidence-ids-supplied",
    title: "Cites only supplied evidence identifiers",
    question:
      "Are all cited evidence identifiers drawn from the allowlist supplied with the request?",
    anchors: {
      1: "Cites identifiers that were never supplied.",
      3: "Cites only supplied identifiers, but attributes a claim to the wrong one.",
      5: "Every citation is both supplied and correctly attributed.",
    },
  },
  {
    id: "domain-vocabulary",
    title: "Uses the CALIPAR vocabulary correctly",
    question:
      "Does the response use the project's domain terms as CONTEXT.md defines them — 'readiness' rather than 'progress', 'pipeline' excluding decided requests, 'open' versus 'concluded'?",
    anchors: {
      1: "Uses terms the domain model explicitly lists under _Avoid_.",
      3: "Mostly correct, with one term used loosely.",
      5: "Uses each term as defined, including the distinctions the model draws.",
    },
  },
];

export interface CriterionScore {
  id: string;
  score: number;
  justification: string;
}

export interface JudgedResponse {
  caseName: string;
  task: string;
  response: string;
  scores: CriterionScore[];
  mean: number;
}

export function judgePrompt(response: string, supplied: string[]): string {
  const criteria = RUBRIC.map(
    (c) =>
      `### ${c.id} — ${c.title}\n${c.question}\n1 = ${c.anchors[1]}\n3 = ${c.anchors[3]}\n5 = ${c.anchors[5]}`,
  ).join("\n\n");

  return `You are scoring one response from a higher-education program-review assistant.

Score each criterion from 1 to 5 using its anchors. Be strict: 5 means the
anchor is fully met, not merely that nothing is obviously wrong. Justify each
score in one sentence quoting the specific text you scored.

## Criteria

${criteria}

## Evidence that was supplied with the request

${supplied.length > 0 ? supplied.map((s) => `- ${s}`).join("\n") : "(none)"}

## Response to score

${response}

Return JSON only: {"scores":[{"id":"...","score":n,"justification":"..."}]}`;
}

export function meanScore(scores: CriterionScore[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
}

export function meanByCriterion(judged: JudgedResponse[]): Record<string, number> {
  const totals: Record<string, { sum: number; count: number }> = {};
  for (const item of judged) {
    for (const score of item.scores) {
      const entry = (totals[score.id] ??= { sum: 0, count: 0 });
      entry.sum += score.score;
      entry.count += 1;
    }
  }
  return Object.fromEntries(
    Object.entries(totals).map(([id, { sum, count }]) => [id, count === 0 ? 0 : sum / count]),
  );
}

export function worstResponses(judged: JudgedResponse[], count = 3): JudgedResponse[] {
  return [...judged].sort((a, b) => a.mean - b.mean).slice(0, count);
}
