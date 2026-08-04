import {
  REVIEW_SECTION_KEYS,
  type ActionPlan,
  type ActionPlanStatus,
  type AnalyticsSnapshot,
  type Organization,
  type ResourceRequest,
  type ReviewRecord,
  type ReviewSectionKey,
  type ReviewStatus,
  type WorkspaceData,
} from "./types";
import { plainTextFromHtml } from "../utils/sanitize";

/** Every program review is written in the same six sections. */
export const REQUIRED_REVIEW_SECTIONS = REVIEW_SECTION_KEYS.length;

/** A review is open until it reaches one of these. See CONTEXT.md. */
const CONCLUDED_REVIEW_STATUSES: ReviewStatus[] = ["validated", "approved"];
/** An action plan is open until it reaches one of these. */
const CONCLUDED_PLAN_STATUSES: ActionPlanStatus[] = [
  "complete",
  "institutionalized",
];
/** A resource request awaits decision until it is funded or declined. */
const AWAITING_DECISION_STATUSES: ResourceRequest["status"][] = [
  "requested",
  "recommended",
];

export interface ReviewSubmissionValidation {
  valid: boolean;
  incompleteSections: ReviewSectionKey[];
}

/**
 * A section is complete when its author has marked it complete *and* it has
 * content. A section ticked but left empty is not complete — see CONTEXT.md.
 */
export function validateReviewSubmission(
  review: ReviewRecord,
): ReviewSubmissionValidation {
  const incompleteSections = REVIEW_SECTION_KEYS.filter((key) => {
    const section = review.sections[key];
    return (
      section.status !== "completed" ||
      plainTextFromHtml(section.contentHtml).length === 0
    );
  });
  return { valid: incompleteSections.length === 0, incompleteSections };
}

export function countCompleteSections(review: ReviewRecord): number {
  return (
    REQUIRED_REVIEW_SECTIONS -
    validateReviewSubmission(review).incompleteSections.length
  );
}

/** A review as every list in the interface needs it, program name joined on. */
export interface ReviewRow {
  id: string;
  organizationId: string;
  programName: string;
  title: string;
  academicYear: string;
  type: ReviewRecord["type"];
  status: ReviewStatus;
  updatedAt: string;
  completeSections: number;
  requiredSections: number;
}

/**
 * Everything the interface needs to know about a workspace that is not itself
 * a stored record. Each value is a function of one reading of the workspace, so
 * two of them shown together can never disagree — see
 * `docs/adr/0001-derivations-read-the-workspace-once.md`.
 *
 * A field belongs here because it is a fact about the domain, never because a
 * page's markup wanted that shape:
 * `docs/adr/0002-derived-values-fill-the-existing-workspace-slot.md`.
 * Rates carry their counts rather than a rounded percentage:
 * `docs/adr/0003-rates-carry-their-counts.md`.
 */
export interface WorkspaceDerivations {
  /** Most recently updated first — how a program lead resumes work. */
  reviews: ReviewRow[];
  reviewCounts: Record<ReviewStatus, number>;
  totalReviews: number;
  openReviewCount: number;
  /** Readiness across every review, as its two counts. */
  readiness: { completeSections: number; requiredSections: number };
  /** The review new work attaches to: the newest draft, else the newest review. */
  workingReview: ReviewRecord | null;

  /** Programs only, by name. The institution itself is not one. */
  programs: Organization[];
  /** Keyed by organization id, each trend oldest year first. */
  analyticsByProgram: Record<string, AnalyticsSnapshot[]>;
  latestAnalytics: AnalyticsSnapshot | null;

  /** Each column ordered by due date. */
  plansByStatus: Record<ActionPlanStatus, ActionPlan[]>;
  totalActionPlans: number;
  openActionPlanCount: number;
  equityGapPlanCount: number;
  /** Keyed by strategic initiative id. */
  planCountsByInitiative: Record<string, number>;

  /** The pipeline order: priority, then title. */
  requests: ResourceRequest[];
  requestCountsByStatus: Record<ResourceRequest["status"], number>;
  /** Everything asked for this cycle, whatever became of it. */
  totalRequestAmountCents: number;
  awaitingDecisionCount: number;
  awaitingDecisionAmountCents: number;
  fundedAmountCents: number;
}

function byAcademicYear(a: AnalyticsSnapshot, b: AnalyticsSnapshot): number {
  return a.academicYear.localeCompare(b.academicYear);
}

export function deriveWorkspace(data: WorkspaceData): WorkspaceDerivations {
  const programNames = new Map(
    data.organizations.map((organization) => [
      organization.id,
      organization.name,
    ]),
  );

  const orderedReviews = [...data.reviews].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  const reviews: ReviewRow[] = orderedReviews.map((review) => ({
    id: review.id,
    organizationId: review.organizationId,
    programName: programNames.get(review.organizationId) ?? "Program",
    title: review.title,
    academicYear: review.academicYear,
    type: review.type,
    status: review.status,
    updatedAt: review.updatedAt,
    completeSections: countCompleteSections(review),
    requiredSections: REQUIRED_REVIEW_SECTIONS,
  }));

  const reviewCounts: Record<ReviewStatus, number> = {
    draft: 0,
    in_review: 0,
    validated: 0,
    approved: 0,
  };
  for (const review of data.reviews) reviewCounts[review.status] += 1;

  const analyticsByProgram: Record<string, AnalyticsSnapshot[]> = {};
  for (const snapshot of [...data.analyticsSnapshots].sort(byAcademicYear)) {
    (analyticsByProgram[snapshot.organizationId] ??= []).push(snapshot);
  }

  const plansByStatus: Record<ActionPlanStatus, ActionPlan[]> = {
    not_started: [],
    ongoing: [],
    complete: [],
    institutionalized: [],
  };
  for (const plan of [...data.actionPlans].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate),
  )) {
    plansByStatus[plan.status].push(plan);
  }

  const planCountsByInitiative: Record<string, number> = {};
  for (const plan of data.actionPlans) {
    planCountsByInitiative[plan.initiativeId] =
      (planCountsByInitiative[plan.initiativeId] ?? 0) + 1;
  }

  const requestCountsByStatus: Record<ResourceRequest["status"], number> = {
    requested: 0,
    recommended: 0,
    funded: 0,
    declined: 0,
  };
  for (const request of data.resourceRequests) {
    requestCountsByStatus[request.status] += 1;
  }

  const awaitingDecision = data.resourceRequests.filter((request) =>
    AWAITING_DECISION_STATUSES.includes(request.status),
  );

  return {
    reviews,
    reviewCounts,
    totalReviews: data.reviews.length,
    openReviewCount: data.reviews.filter(
      (review) => !CONCLUDED_REVIEW_STATUSES.includes(review.status),
    ).length,
    readiness: {
      completeSections: reviews.reduce(
        (sum, review) => sum + review.completeSections,
        0,
      ),
      requiredSections: reviews.length * REQUIRED_REVIEW_SECTIONS,
    },
    workingReview:
      orderedReviews.find((review) => review.status === "draft") ??
      orderedReviews[0] ??
      null,

    programs: data.organizations
      .filter((organization) => organization.type === "program")
      .sort((a, b) => a.name.localeCompare(b.name)),
    analyticsByProgram,
    latestAnalytics:
      [...data.analyticsSnapshots].sort(byAcademicYear).at(-1) ?? null,

    plansByStatus,
    totalActionPlans: data.actionPlans.length,
    openActionPlanCount: data.actionPlans.filter(
      (plan) => !CONCLUDED_PLAN_STATUSES.includes(plan.status),
    ).length,
    equityGapPlanCount: data.actionPlans.filter(
      (plan) => plan.addressesEquityGap,
    ).length,
    planCountsByInitiative,

    requests: [...data.resourceRequests].sort(
      (a, b) => a.priority - b.priority || a.title.localeCompare(b.title),
    ),
    requestCountsByStatus,
    totalRequestAmountCents: data.resourceRequests.reduce(
      (sum, request) => sum + request.amountCents,
      0,
    ),
    awaitingDecisionCount: awaitingDecision.length,
    awaitingDecisionAmountCents: awaitingDecision.reduce(
      (sum, request) => sum + request.amountCents,
      0,
    ),
    fundedAmountCents: data.resourceRequests
      .filter((request) => request.status === "funded")
      .reduce((sum, request) => sum + request.amountCents, 0),
  };
}
