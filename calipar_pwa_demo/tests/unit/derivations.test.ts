import { describe, expect, it } from "vitest";

import {
  deriveAnalyticsTrend,
  deriveWorkspace,
} from "@/lib/domain/derivations";
import { createDemoSeed } from "@/lib/seed/data";
import { makeWorkspaceData } from "../support/workspace-fixture";

describe("workspace derivations", () => {
  const seed = createDemoSeed();

  it("counts reviews by status and totals them", () => {
    const derived = deriveWorkspace(seed);
    expect(derived.totalReviews).toBe(seed.reviews.length);
    expect(
      Object.values(derived.reviewCounts).reduce((sum, value) => sum + value, 0),
    ).toBe(derived.totalReviews);
  });

  it("counts plans and resource requests that are not yet concluded", () => {
    const derived = deriveWorkspace(seed);
    expect(derived.activeActionPlans).toBe(
      seed.actionPlans.filter(({ status }) =>
        ["not_started", "ongoing"].includes(status),
      ).length,
    );
    expect(derived.pendingResourceRequests).toBe(
      seed.resourceRequests.filter(({ status }) =>
        ["requested", "recommended"].includes(status),
      ).length,
    );
    expect(derived.requestedAmountCents).toBe(
      seed.resourceRequests
        .filter(({ status }) => ["requested", "recommended"].includes(status))
        .reduce((sum, { amountCents }) => sum + amountCents, 0),
    );
  });

  it("reports the most recent academic year of analytics", () => {
    const derived = deriveWorkspace(seed);
    const latest = [...seed.analyticsSnapshots]
      .map(({ academicYear }) => academicYear)
      .sort()
      .at(-1);
    expect(derived.latestAnalytics?.academicYear).toBe(latest);
    expect(derived.latestAnalytics?.successRate).toBeTypeOf("number");
  });

  it("derives nothing from an empty workspace rather than zero", () => {
    const derived = deriveWorkspace(makeWorkspaceData());
    expect(derived.latestAnalytics).toBeNull();
    expect(derived.totalReviews).toBe(0);
    expect(derived.activeActionPlans).toBe(0);
    expect(derived.pendingResourceRequests).toBe(0);
    expect(derived.requestedAmountCents).toBe(0);
    expect(derived.reviewCounts).toEqual({
      draft: 0,
      in_review: 0,
      validated: 0,
      approved: 0,
    });
  });

  it("orders the analytics trend by academic year", () => {
    const trend = deriveAnalyticsTrend(seed.analyticsSnapshots);
    expect(trend.map(({ academicYear }) => academicYear)).toEqual(
      [...seed.analyticsSnapshots].map(({ academicYear }) => academicYear).sort(),
    );
    expect(trend).toHaveLength(seed.analyticsSnapshots.length);
  });

  it("does not invent a rate over an empty denominator", () => {
    const [point] = deriveAnalyticsTrend([
      {
        id: "analytics-empty-denominators",
        organizationId: "org-biology",
        academicYear: "2020-21",
        enrollment: 0,
        completions: 0,
        successfulEnrollments: 0,
        attemptedEnrollments: 0,
        equityGroup: "Synthetic group",
        equityGroupSuccessful: 0,
        equityGroupAttempted: 0,
        sloAssessed: 0,
        sloMet: 0,
        activeCourses: 0,
        updatedAt: "2026-07-29T20:00:00.000Z",
      },
    ]);
    expect(point?.successRate).toBeNull();
    expect(point?.equityGroupSuccessRate).toBeNull();
    expect(point?.sloAttainmentRate).toBeNull();
  });
});
