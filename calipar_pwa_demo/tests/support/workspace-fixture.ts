import type { WorkspaceDerivations } from "@/lib/domain/derivations";
import type { WorkspaceState } from "@/components/workspace-provider";
import {
  createEmptyReviewSections,
  type Organization,
  type ReviewRecord,
  type WorkspaceData,
} from "@/lib/domain/types";

/**
 * Typed builders for the workspace seam. Every field has a real default, so a
 * test states only what it cares about and the compiler still checks the rest —
 * no `as never` escape hatch.
 */

const NOW = "2026-07-31T00:00:00.000Z";

export function makeWorkspaceData(over: Partial<WorkspaceData> = {}): WorkspaceData {
  return {
    organizations: [],
    strategicInitiatives: [],
    reviews: [],
    actionPlans: [],
    resourceRequests: [],
    analyticsSnapshots: [],
    activities: [],
    preferences: [],
    chatThreads: [],
    chatMessages: [],
    ...over,
  };
}

export function makeDerivations(
  over: Partial<WorkspaceDerivations> = {},
): WorkspaceDerivations {
  return {
    reviewCounts: { draft: 0, in_review: 0, validated: 0, approved: 0 },
    totalReviews: 0,
    activeActionPlans: 0,
    pendingResourceRequests: 0,
    requestedAmountCents: 0,
    latestAnalytics: null,
    ...over,
  };
}

export function makeOrganization(over: Partial<Organization> = {}): Organization {
  return {
    id: "org-biology",
    type: "program",
    name: "Biology",
    parentId: null,
    code: "BIOL",
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

export function makeReview(over: Partial<ReviewRecord> = {}): ReviewRecord {
  return {
    id: "review-under-test",
    organizationId: "org-biology",
    title: "Local review under test",
    academicYear: "2025-26",
    type: "annual",
    status: "draft",
    sections: createEmptyReviewSections(NOW),
    submittedAt: null,
    revision: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

export function loadingState(): WorkspaceState {
  return { status: "loading" };
}

export function errorState(message = "IndexedDB is unavailable in this browser."): WorkspaceState {
  return { status: "error", message };
}

export function readyState(
  over: {
    data?: Partial<WorkspaceData>;
    derived?: Partial<WorkspaceDerivations>;
  } = {},
): WorkspaceState {
  return {
    status: "ready",
    data: makeWorkspaceData(over.data),
    derived: makeDerivations(over.derived),
  };
}
