import { describe, expect, it } from "vitest";

import {
  selectAnalyticsForOrganization,
  selectPlansForReview,
  selectResourcesForReview,
  selectReviewsForOrganization,
} from "@/lib/domain/selectors";
import { createDemoSeed } from "@/lib/seed/data";

describe("workspace selectors", () => {
  const seed = createDemoSeed();

  it("filters and orders reviews by most recent update", () => {
    const records = selectReviewsForOrganization(seed.reviews, "org-biology");
    expect(records.every(({ organizationId }) => organizationId === "org-biology")).toBe(
      true,
    );
    expect(records.map(({ updatedAt }) => updatedAt)).toEqual(
      [...records].map(({ updatedAt }) => updatedAt).sort().reverse(),
    );
  });

  it("orders plans by due date and resources by priority then title", () => {
    const reviewId = "review-biology-2025";
    const plans = selectPlansForReview(seed.actionPlans, reviewId);
    expect(plans.every((plan) => plan.reviewId === reviewId)).toBe(true);
    expect(plans.map(({ dueDate }) => dueDate)).toEqual(
      [...plans].map(({ dueDate }) => dueDate).sort(),
    );

    const resources = selectResourcesForReview(seed.resourceRequests, reviewId);
    expect(resources.every((request) => request.reviewId === reviewId)).toBe(
      true,
    );
    expect(resources.map(({ priority }) => priority)).toEqual(
      [...resources].map(({ priority }) => priority).sort((a, b) => a - b),
    );
  });

  it("filters analytics and derives explicit rates", () => {
    const analytics = selectAnalyticsForOrganization(
      seed.analyticsSnapshots,
      "org-biology",
    );
    expect(analytics.every(({ organizationId }) => organizationId === "org-biology")).toBe(
      true,
    );
    expect(analytics.map(({ academicYear }) => academicYear)).toEqual(
      [...analytics].map(({ academicYear }) => academicYear).sort(),
    );
    expect(analytics.at(-1)?.successRate).toBeTypeOf("number");
  });
});
