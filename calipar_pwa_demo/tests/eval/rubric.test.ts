import { describe, expect, it } from "vitest";

import {
  judgePrompt,
  meanByCriterion,
  meanScore,
  RUBRIC,
  worstResponses,
} from "./judge/rubric";

describe("advisory judge rubric", () => {
  it("defines five criteria, each with anchors at 1, 3, and 5", () => {
    expect(RUBRIC).toHaveLength(5);
    for (const criterion of RUBRIC) {
      expect(criterion.id).toMatch(/^[a-z-]+$/);
      expect(criterion.question.length).toBeGreaterThan(20);
      expect(criterion.anchors[1].length).toBeGreaterThan(10);
      expect(criterion.anchors[3].length).toBeGreaterThan(10);
      expect(criterion.anchors[5].length).toBeGreaterThan(10);
    }
    expect(new Set(RUBRIC.map((c) => c.id)).size).toBe(5);
  });

  it("covers the four assertions the deterministic evals also make, plus vocabulary", () => {
    const ids = RUBRIC.map((c) => c.id);
    expect(ids).toEqual([
      "figures-traceable",
      "rates-carry-counts",
      "no-compliance-claim",
      "evidence-ids-supplied",
      "domain-vocabulary",
    ]);
  });

  it("builds a prompt carrying every criterion and the supplied evidence", () => {
    const prompt = judgePrompt("Course success was 80 of 100.", ["80 of 100 attempted"]);
    for (const criterion of RUBRIC) expect(prompt).toContain(criterion.id);
    expect(prompt).toContain("80 of 100 attempted");
    expect(prompt).toContain("Return JSON only");
  });

  it("says so explicitly when no evidence was supplied", () => {
    expect(judgePrompt("text", [])).toContain("(none)");
  });

  it("averages scores and reports zero for an empty set", () => {
    expect(meanScore([{ id: "a", score: 4, justification: "" }, { id: "b", score: 2, justification: "" }])).toBe(3);
    expect(meanScore([])).toBe(0);
  });

  it("averages per criterion across responses", () => {
    const judged = [
      { caseName: "a", task: "analyze", response: "", mean: 0, scores: [{ id: "x", score: 5, justification: "" }] },
      { caseName: "b", task: "analyze", response: "", mean: 0, scores: [{ id: "x", score: 3, justification: "" }] },
    ];
    expect(meanByCriterion(judged)).toEqual({ x: 4 });
  });

  it("surfaces the worst responses first", () => {
    const judged = [
      { caseName: "good", task: "analyze", response: "", scores: [], mean: 4.8 },
      { caseName: "bad", task: "analyze", response: "", scores: [], mean: 1.2 },
      { caseName: "mid", task: "analyze", response: "", scores: [], mean: 3 },
    ];
    expect(worstResponses(judged, 2).map((r) => r.caseName)).toEqual(["bad", "mid"]);
  });
});
