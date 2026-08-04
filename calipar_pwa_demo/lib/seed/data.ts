import {
  createEmptyReviewSections,
  type ActivityRecord,
  type ActionPlan,
  type AnalyticsSnapshot,
  type Organization,
  type ResourceRequest,
  type ReviewRecord,
  type ReviewSectionKey,
  type StrategicInitiative,
  type WorkspaceData,
} from "../domain/types";

const CREATED_AT = "2026-07-01T16:00:00.000Z";
const UPDATED_AT = "2026-07-29T16:00:00.000Z";

const organizations: Organization[] = [
  {
    id: "org-calipar-college",
    type: "institution",
    name: "CALIPAR Community College",
    parentId: null,
    code: "CALIPAR",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  ...[
    ["org-biology", "Biology", "BIO"],
    ["org-computer-science", "Computer Science", "CS"],
    ["org-english", "English", "ENGL"],
    ["org-mathematics", "Mathematics", "MATH"],
  ].map(
    ([id, name, code]): Organization => ({
      id: id!,
      type: "program",
      name: name!,
      parentId: "org-calipar-college",
      code: code!,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    }),
  ),
];

const strategicInitiatives: StrategicInitiative[] = [
  [
    "initiative-equitable-success",
    1,
    "Advance equitable student success",
    "Close outcome gaps through evidence-based program improvement.",
  ],
  [
    "initiative-completion",
    2,
    "Increase completion",
    "Improve completion of certificates, degrees, and transfer pathways.",
  ],
  [
    "initiative-teaching",
    3,
    "Strengthen teaching and learning",
    "Support inclusive instruction, assessment, and curriculum currency.",
  ],
  [
    "initiative-access",
    4,
    "Expand access and belonging",
    "Remove barriers and build a welcoming learning environment.",
  ],
  [
    "initiative-stewardship",
    5,
    "Practice responsible stewardship",
    "Align people, technology, facilities, and budgets with demonstrated need.",
  ],
].map(([id, goalNumber, title, description]) => ({
  id: String(id),
  goalNumber: Number(goalNumber),
  title: String(title),
  description: String(description),
  active: true,
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
}));

const sectionNarratives: Record<ReviewSectionKey, string> = {
  program_overview:
    "<p>The program serves transfer, career, and general-education students through a coherent sequence of courses.</p>",
  student_success_outcomes:
    "<p>Aggregate course success increased while completion remained stable. The program will continue monitoring disaggregated outcomes.</p>",
  curriculum_review:
    "<p>All active courses were reviewed for currency, prerequisites, modality, and alignment with program outcomes.</p>",
  equity_analysis:
    "<p>The program identified an outcome gap in the synthetic demo data and prioritized embedded tutoring and early outreach.</p>",
  action_plans_goals:
    "<p>The primary action is a two-term pilot with clear milestones, ownership, and outcome measures.</p>",
  resource_needs:
    "<p>Requested resources are connected to an action plan and include a documented rationale and object-code series.</p>",
};

function sectionsFor(
  mode: "complete" | "partial" | "empty",
  now = UPDATED_AT,
) {
  const sections = createEmptyReviewSections(now);
  for (const [index, key] of Object.keys(sections).entries()) {
    const typedKey = key as ReviewSectionKey;
    if (mode === "complete" || (mode === "partial" && index < 3)) {
      sections[typedKey] = {
        ...sections[typedKey],
        contentHtml: sectionNarratives[typedKey],
        status: "completed",
      };
    } else if (mode === "partial" && index === 3) {
      sections[typedKey] = {
        ...sections[typedKey],
        contentHtml: "<p>Analysis in progress.</p>",
        status: "in_progress",
      };
    }
  }
  return sections;
}

const reviews: ReviewRecord[] = [
  {
    id: "review-biology-2025",
    organizationId: "org-biology",
    title: "Biology Annual Program Review",
    academicYear: "2025-26",
    type: "annual",
    status: "draft",
    sections: sectionsFor("partial"),
    submittedAt: null,
    revision: 2,
    createdAt: "2026-07-10T16:00:00.000Z",
    updatedAt: UPDATED_AT,
  },
  {
    id: "review-cs-2025",
    organizationId: "org-computer-science",
    title: "Computer Science Comprehensive Program Review",
    academicYear: "2025-26",
    type: "comprehensive",
    status: "in_review",
    sections: sectionsFor("complete"),
    submittedAt: "2026-07-25T18:00:00.000Z",
    revision: 4,
    createdAt: "2026-06-15T16:00:00.000Z",
    updatedAt: "2026-07-25T18:00:00.000Z",
  },
  {
    id: "review-english-2024",
    organizationId: "org-english",
    title: "English Annual Program Review",
    academicYear: "2024-25",
    type: "annual",
    status: "validated",
    sections: sectionsFor("complete"),
    submittedAt: "2025-05-14T18:00:00.000Z",
    revision: 6,
    createdAt: "2025-03-10T16:00:00.000Z",
    updatedAt: "2025-06-02T18:00:00.000Z",
  },
  {
    id: "review-math-2024",
    organizationId: "org-mathematics",
    title: "Mathematics Comprehensive Program Review",
    academicYear: "2024-25",
    type: "comprehensive",
    status: "approved",
    sections: sectionsFor("complete"),
    submittedAt: "2025-04-22T18:00:00.000Z",
    revision: 8,
    createdAt: "2025-02-03T16:00:00.000Z",
    updatedAt: "2025-06-18T18:00:00.000Z",
  },
];

const actionPlans: ActionPlan[] = [
  {
    id: "plan-biology-tutoring",
    reviewId: "review-biology-2025",
    organizationId: "org-biology",
    initiativeId: "initiative-equitable-success",
    title: "Embed peer tutoring in gateway courses",
    description:
      "Pilot embedded tutoring in two high-enrollment sections and compare aggregate outcomes.",
    owner: "Biology Department",
    dueDate: "2027-06-30",
    status: "ongoing",
    addressesEquityGap: true,
    equityJustification:
      "The synthetic aggregate data show a persistent success-rate difference for the selected group.",
    revision: 1,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  {
    id: "plan-cs-pathway",
    reviewId: "review-cs-2025",
    organizationId: "org-computer-science",
    initiativeId: "initiative-completion",
    title: "Clarify the degree pathway",
    description:
      "Publish a term-by-term sequence and monitor gateway-course progression.",
    owner: "Computer Science Department",
    dueDate: "2026-12-18",
    status: "ongoing",
    addressesEquityGap: false,
    equityJustification: "",
    revision: 1,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  {
    id: "plan-english-assessment",
    reviewId: "review-english-2024",
    organizationId: "org-english",
    initiativeId: "initiative-teaching",
    title: "Align signature assessments",
    description:
      "Calibrate a shared rubric and review aggregate SLO evidence each semester.",
    owner: "English Department",
    dueDate: "2026-05-22",
    status: "complete",
    addressesEquityGap: false,
    equityJustification: "",
    revision: 2,
    createdAt: "2025-07-01T16:00:00.000Z",
    updatedAt: "2026-05-22T16:00:00.000Z",
  },
];

const resourceRequests: ResourceRequest[] = [
  {
    id: "resource-biology-tutors",
    reviewId: "review-biology-2025",
    actionPlanId: "plan-biology-tutoring",
    organizationId: "org-biology",
    title: "Peer tutor hourly support",
    rationale: "Staff two gateway-course sections during the pilot.",
    objectCodeSeries: "2000",
    amountCents: 840_000,
    priority: 1,
    status: "requested",
    revision: 1,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  {
    id: "resource-biology-equipment",
    reviewId: "review-biology-2025",
    actionPlanId: null,
    organizationId: "org-biology",
    title: "Microscope replacement cycle",
    rationale: "Replace end-of-life instructional equipment.",
    objectCodeSeries: "6000",
    amountCents: 2_450_000,
    priority: 2,
    status: "recommended",
    revision: 1,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  {
    id: "resource-cs-lab",
    reviewId: "review-cs-2025",
    actionPlanId: "plan-cs-pathway",
    organizationId: "org-computer-science",
    title: "Cloud lab licenses",
    rationale: "Provide consistent browser-based development environments.",
    objectCodeSeries: "5000",
    amountCents: 1_200_000,
    priority: 1,
    status: "funded",
    revision: 2,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  {
    id: "resource-english-release",
    reviewId: "review-english-2024",
    actionPlanId: "plan-english-assessment",
    organizationId: "org-english",
    title: "Assessment coordination release time",
    rationale: "Support rubric calibration and evidence review.",
    objectCodeSeries: "1000",
    amountCents: 350_000,
    priority: 1,
    status: "funded",
    revision: 1,
    createdAt: "2025-07-01T16:00:00.000Z",
    updatedAt: "2025-08-15T16:00:00.000Z",
  },
];

const analyticsSnapshots: AnalyticsSnapshot[] = [
  ["analytics-2021", "2021-22", 780, 104, 612, 780, 118, 168, 420, 350, 18],
  ["analytics-2022", "2022-23", 812, 112, 650, 812, 130, 174, 438, 369, 18],
  ["analytics-2023", "2023-24", 846, 121, 686, 846, 144, 184, 452, 385, 19],
  ["analytics-2024", "2024-25", 884, 132, 728, 884, 158, 194, 468, 405, 19],
  ["analytics-2025", "2025-26", 916, 141, 770, 916, 176, 208, 486, 427, 20],
].map(
  ([
    id,
    academicYear,
    enrollment,
    completions,
    successfulEnrollments,
    attemptedEnrollments,
    equityGroupSuccessful,
    equityGroupAttempted,
    sloAssessed,
    sloMet,
    activeCourses,
  ]): AnalyticsSnapshot => ({
    id: String(id),
    organizationId: "org-biology",
    academicYear: String(academicYear),
    enrollment: Number(enrollment),
    completions: Number(completions),
    successfulEnrollments: Number(successfulEnrollments),
    attemptedEnrollments: Number(attemptedEnrollments),
    equityGroup: "Students from historically underserved groups",
    equityGroupSuccessful: Number(equityGroupSuccessful),
    equityGroupAttempted: Number(equityGroupAttempted),
    sloAssessed: Number(sloAssessed),
    sloMet: Number(sloMet),
    activeCourses: Number(activeCourses),
    updatedAt: UPDATED_AT,
  }),
);

const activitySeed: Array<
  Pick<ActivityRecord, "entityType" | "entityId" | "action" | "summary">
> = [
  {
    entityType: "review",
    entityId: "review-biology-2025",
    action: "review.updated",
    summary: "Biology updated its equity analysis.",
  },
  {
    entityType: "resource_request",
    entityId: "resource-biology-tutors",
    action: "resource.created",
    summary: "Biology added a peer tutor resource request.",
  },
  {
    entityType: "action_plan",
    entityId: "plan-biology-tutoring",
    action: "plan.updated",
    summary: "The embedded tutoring pilot moved to ongoing.",
  },
  {
    entityType: "review",
    entityId: "review-cs-2025",
    action: "review.submitted",
    summary: "Computer Science submitted its comprehensive review.",
  },
  {
    entityType: "resource_request",
    entityId: "resource-cs-lab",
    action: "resource.funded",
    summary: "Cloud lab licenses were marked funded.",
  },
  {
    entityType: "review",
    entityId: "review-english-2024",
    action: "review.validated",
    summary: "English review was validated.",
  },
  {
    entityType: "action_plan",
    entityId: "plan-english-assessment",
    action: "plan.completed",
    summary: "English completed shared assessment alignment.",
  },
  {
    entityType: "review",
    entityId: "review-math-2024",
    action: "review.approved",
    summary: "Mathematics review was approved.",
  },
  {
    entityType: "workspace",
    entityId: "calipar-demo",
    action: "analytics.refreshed",
    summary: "Synthetic five-year analytics were refreshed.",
  },
  {
    entityType: "workspace",
    entityId: "calipar-demo",
    action: "workspace.seeded",
    summary: "The CALIPAR demo workspace was prepared.",
  },
];

const activities: ActivityRecord[] = activitySeed.map((activity, index) => ({
  id: `activity-${String(index + 1).padStart(2, "0")}`,
  ...activity,
  occurredAt: new Date(
    Date.parse(UPDATED_AT) - index * 86_400_000,
  ).toISOString(),
}));

export const DEMO_SEED: Readonly<WorkspaceData> = Object.freeze({
  organizations,
  strategicInitiatives,
  reviews,
  actionPlans,
  resourceRequests,
  analyticsSnapshots,
  activities,
  preferences: [],
  chatThreads: [],
  chatMessages: [],
});

export function createDemoSeed(): WorkspaceData {
  return structuredClone(DEMO_SEED);
}
