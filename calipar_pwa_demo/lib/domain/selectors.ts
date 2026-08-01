import type {
  ActionPlan,
  AnalyticsSnapshot,
  ResourceRequest,
  ReviewRecord,
} from "./types";
import { deriveAnalyticsTrend } from "../db/repository";

export function selectReviewsForOrganization(
  reviews: ReviewRecord[],
  organizationId: string,
): ReviewRecord[] {
  return reviews
    .filter((review) => review.organizationId === organizationId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function selectPlansForReview(
  plans: ActionPlan[],
  reviewId: string,
): ActionPlan[] {
  return plans
    .filter((plan) => plan.reviewId === reviewId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function selectResourcesForReview(
  requests: ResourceRequest[],
  reviewId: string,
): ResourceRequest[] {
  return requests
    .filter((request) => request.reviewId === reviewId)
    .sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title));
}

export function selectAnalyticsForOrganization(
  snapshots: AnalyticsSnapshot[],
  organizationId: string,
) {
  return deriveAnalyticsTrend(
    snapshots.filter(
      (snapshot) => snapshot.organizationId === organizationId,
    ),
  );
}
