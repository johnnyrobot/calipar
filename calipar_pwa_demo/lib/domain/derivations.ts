import type { AnalyticsSnapshot, ReviewRecord, WorkspaceData } from "./types";

/**
 * Everything the interface needs to know about a workspace that is not itself
 * a stored record. Each value is a function of one reading of the workspace, so
 * two of them shown together can never disagree — see
 * `docs/adr/0001-derivations-read-the-workspace-once.md`.
 *
 * A field belongs here because it is a fact about the domain, never because a
 * page's markup wanted that shape:
 * `docs/adr/0002-derived-values-fill-the-existing-workspace-slot.md`.
 */
export interface WorkspaceDerivations {
  reviewCounts: Record<ReviewRecord["status"], number>;
  totalReviews: number;
  activeActionPlans: number;
  pendingResourceRequests: number;
  requestedAmountCents: number;
  latestAnalytics: null | {
    academicYear: string;
    enrollment: number;
    completions: number;
    successRate: number | null;
    equityGroupSuccessRate: number | null;
    sloAttainmentRate: number | null;
  };
}

export type AnalyticsTrendPoint = AnalyticsSnapshot & {
  successRate: number | null;
  equityGroupSuccessRate: number | null;
  sloAttainmentRate: number | null;
};

function safeRate(numerator: number, denominator: number): number | null {
  return denominator > 0
    ? Math.round((numerator / denominator) * 10_000) / 100
    : null;
}

export function deriveAnalyticsTrend(
  snapshots: AnalyticsSnapshot[],
): AnalyticsTrendPoint[] {
  return [...snapshots]
    .sort((a, b) => a.academicYear.localeCompare(b.academicYear))
    .map((snapshot) => ({
      ...snapshot,
      successRate: safeRate(
        snapshot.successfulEnrollments,
        snapshot.attemptedEnrollments,
      ),
      equityGroupSuccessRate: safeRate(
        snapshot.equityGroupSuccessful,
        snapshot.equityGroupAttempted,
      ),
      sloAttainmentRate: safeRate(snapshot.sloMet, snapshot.sloAssessed),
    }));
}

export function deriveWorkspace(data: WorkspaceData): WorkspaceDerivations {
  const reviewCounts: WorkspaceDerivations["reviewCounts"] = {
    draft: 0,
    in_review: 0,
    validated: 0,
    approved: 0,
  };
  for (const review of data.reviews) reviewCounts[review.status] += 1;
  const latest = deriveAnalyticsTrend(data.analyticsSnapshots).at(-1);
  return {
    reviewCounts,
    totalReviews: data.reviews.length,
    activeActionPlans: data.actionPlans.filter((plan) =>
      ["not_started", "ongoing"].includes(plan.status),
    ).length,
    pendingResourceRequests: data.resourceRequests.filter((request) =>
      ["requested", "recommended"].includes(request.status),
    ).length,
    requestedAmountCents: data.resourceRequests
      .filter((request) =>
        ["requested", "recommended"].includes(request.status),
      )
      .reduce((sum, request) => sum + request.amountCents, 0),
    latestAnalytics: latest
      ? {
          academicYear: latest.academicYear,
          enrollment: latest.enrollment,
          completions: latest.completions,
          successRate: latest.successRate,
          equityGroupSuccessRate: latest.equityGroupSuccessRate,
          sloAttainmentRate: latest.sloAttainmentRate,
        }
      : null,
  };
}
