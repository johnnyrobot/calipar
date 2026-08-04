import { describe, expect, it } from "vitest";

import {
  REQUIRED_REVIEW_SECTIONS,
  countCompleteSections,
  deriveWorkspace,
  validateReviewSubmission,
} from "@/lib/domain/derivations";
import { createDemoSeed } from "@/lib/seed/data";
import { makeReview, makeWorkspaceData } from "../support/workspace-fixture";

describe("workspace derivations", () => {
  const seed = createDemoSeed();

  it("orders reviews most recently updated first and joins the program name", () => {
    const { reviews } = deriveWorkspace(seed);
    expect(reviews.map(({ updatedAt }) => updatedAt)).toEqual(
      [...reviews].map(({ updatedAt }) => updatedAt).sort().reverse(),
    );
    for (const review of reviews) {
      const program = seed.organizations.find(
        ({ id }) => id === review.organizationId,
      );
      expect(review.programName).toBe(program?.name);
    }
  });

  it("counts a section complete only when it is marked complete and has content", () => {
    const marked = makeReview();
    for (const key of Object.keys(marked.sections) as Array<
      keyof typeof marked.sections
    >) {
      marked.sections[key] = {
        ...marked.sections[key],
        status: "completed",
        contentHtml: "",
      };
    }
    expect(countCompleteSections(marked)).toBe(0);
    expect(validateReviewSubmission(marked).valid).toBe(false);
    expect(validateReviewSubmission(marked).incompleteSections).toHaveLength(
      REQUIRED_REVIEW_SECTIONS,
    );

    const withContent = makeReview();
    for (const key of Object.keys(withContent.sections) as Array<
      keyof typeof withContent.sections
    >) {
      withContent.sections[key] = {
        ...withContent.sections[key],
        status: "completed",
        contentHtml: "<p>Written.</p>",
      };
    }
    expect(countCompleteSections(withContent)).toBe(REQUIRED_REVIEW_SECTIONS);
    expect(validateReviewSubmission(withContent).valid).toBe(true);
  });

  it("counts open reviews and plans by what has not concluded", () => {
    const derived = deriveWorkspace(seed);
    expect(derived.openReviewCount).toBe(
      seed.reviews.filter(({ status }) => ["draft", "in_review"].includes(status))
        .length,
    );
    expect(derived.openActionPlanCount).toBe(
      seed.actionPlans.filter(({ status }) =>
        ["not_started", "ongoing"].includes(status),
      ).length,
    );
    expect(derived.totalActionPlans).toBe(seed.actionPlans.length);
    expect(derived.equityGapPlanCount).toBe(
      seed.actionPlans.filter(({ addressesEquityGap }) => addressesEquityGap)
        .length,
    );
  });

  it("separates what was asked for from what awaits a decision and what was funded", () => {
    const derived = deriveWorkspace(seed);
    const sum = (statuses: string[]) =>
      seed.resourceRequests
        .filter(({ status }) => statuses.includes(status))
        .reduce((total, { amountCents }) => total + amountCents, 0);

    expect(derived.totalRequestAmountCents).toBe(
      sum(["requested", "recommended", "funded", "declined"]),
    );
    expect(derived.awaitingDecisionAmountCents).toBe(
      sum(["requested", "recommended"]),
    );
    expect(derived.fundedAmountCents).toBe(sum(["funded"]));
    // The bug this replaced: one total standing in for all three.
    expect(derived.totalRequestAmountCents).not.toBe(
      derived.awaitingDecisionAmountCents,
    );
  });

  it("orders requests by priority, then title", () => {
    const { requests } = deriveWorkspace(seed);
    expect(requests.map(({ priority }) => priority)).toEqual(
      [...requests].map(({ priority }) => priority).sort((a, b) => a - b),
    );
  });

  it("orders each plan column by due date", () => {
    const { plansByStatus } = deriveWorkspace(seed);
    for (const plans of Object.values(plansByStatus)) {
      expect(plans.map(({ dueDate }) => dueDate)).toEqual(
        [...plans].map(({ dueDate }) => dueDate).sort(),
      );
    }
  });

  it("keys analytics by program, oldest year first", () => {
    const { analyticsByProgram, latestAnalytics } = deriveWorkspace(seed);
    for (const [organizationId, trend] of Object.entries(analyticsByProgram)) {
      expect(trend.every((row) => row.organizationId === organizationId)).toBe(
        true,
      );
      expect(trend.map(({ academicYear }) => academicYear)).toEqual(
        [...trend].map(({ academicYear }) => academicYear).sort(),
      );
    }
    expect(latestAnalytics?.academicYear).toBe(
      [...seed.analyticsSnapshots]
        .map(({ academicYear }) => academicYear)
        .sort()
        .at(-1),
    );
  });

  it("carries analytics counts rather than a rounded rate", () => {
    const { latestAnalytics } = deriveWorkspace(seed);
    expect(latestAnalytics).not.toBeNull();
    expect(latestAnalytics).not.toHaveProperty("successRate");
    expect(latestAnalytics?.attemptedEnrollments).toBeTypeOf("number");
    expect(latestAnalytics?.successfulEnrollments).toBeTypeOf("number");
  });

  it("reports readiness as its two counts", () => {
    const derived = deriveWorkspace(seed);
    expect(derived.readiness.requiredSections).toBe(
      seed.reviews.length * REQUIRED_REVIEW_SECTIONS,
    );
    expect(derived.readiness.completeSections).toBe(
      derived.reviews.reduce((sum, review) => sum + review.completeSections, 0),
    );
  });

  it("attaches new work to the newest draft, falling back to the newest review", () => {
    const derived = deriveWorkspace(seed);
    expect(derived.workingReview?.status).toBe("draft");

    const noDrafts = makeWorkspaceData({
      reviews: [
        makeReview({ id: "older", status: "approved", updatedAt: "2026-01-01T00:00:00.000Z" }),
        makeReview({ id: "newer", status: "validated", updatedAt: "2026-06-01T00:00:00.000Z" }),
      ],
    });
    expect(deriveWorkspace(noDrafts).workingReview?.id).toBe("newer");
    expect(deriveWorkspace(makeWorkspaceData()).workingReview).toBeNull();
  });

  it("lists programs by name and leaves out the institution", () => {
    const { programs } = deriveWorkspace(seed);
    expect(programs.every(({ type }) => type === "program")).toBe(true);
    expect(programs.map(({ name }) => name)).toEqual(
      [...programs].map(({ name }) => name).sort(),
    );
  });

  it("derives nothing from an empty workspace rather than zero", () => {
    const derived = deriveWorkspace(makeWorkspaceData());
    expect(derived.latestAnalytics).toBeNull();
    expect(derived.workingReview).toBeNull();
    expect(derived.reviews).toEqual([]);
    expect(derived.totalReviews).toBe(0);
    expect(derived.openReviewCount).toBe(0);
    expect(derived.readiness).toEqual({
      completeSections: 0,
      requiredSections: 0,
    });
    expect(derived.totalRequestAmountCents).toBe(0);
    expect(derived.reviewCounts).toEqual({
      draft: 0,
      in_review: 0,
      validated: 0,
      approved: 0,
    });
  });
});
