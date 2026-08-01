import { z } from "zod";

export const SCHEMA_VERSION = 1 as const;
export const SEED_VERSION = 1 as const;
export const WORKSPACE_FORMAT = "calipar-demo-workspace" as const;

export const IsoDateSchema = z.string().datetime({ offset: true });
export const IdSchema = z.string().min(1).max(128);

export const OrganizationSchema = z.object({
  id: IdSchema,
  type: z.enum(["institution", "program"]),
  name: z.string().min(1).max(200),
  parentId: IdSchema.nullable(),
  code: z.string().min(1).max(32),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});
export type Organization = z.infer<typeof OrganizationSchema>;

export const StrategicInitiativeSchema = z.object({
  id: IdSchema,
  goalNumber: z.number().int().min(1),
  title: z.string().min(1).max(240),
  description: z.string().min(1).max(2_000),
  active: z.boolean(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});
export type StrategicInitiative = z.infer<typeof StrategicInitiativeSchema>;

export const ReviewTypeSchema = z.enum(["annual", "comprehensive"]);
export type ReviewType = z.infer<typeof ReviewTypeSchema>;
export const ReviewStatusSchema = z.enum([
  "draft",
  "in_review",
  "validated",
  "approved",
]);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;
export const ReviewSectionStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
]);
export type ReviewSectionStatus = z.infer<typeof ReviewSectionStatusSchema>;

export const REVIEW_SECTION_KEYS = [
  "program_overview",
  "student_success_outcomes",
  "curriculum_review",
  "equity_analysis",
  "action_plans_goals",
  "resource_needs",
] as const;
export const ReviewSectionKeySchema = z.enum(REVIEW_SECTION_KEYS);
export type ReviewSectionKey = z.infer<typeof ReviewSectionKeySchema>;

export const ReviewSectionSchema = z.object({
  key: ReviewSectionKeySchema,
  title: z.string().min(1).max(120),
  contentHtml: z.string().max(100_000),
  status: ReviewSectionStatusSchema,
  acceptedAiDrafts: z.array(z.string().max(20_000)).max(20),
  updatedAt: IsoDateSchema,
});
export type ReviewSection = z.infer<typeof ReviewSectionSchema>;

export const ReviewSectionsSchema = z
  .object({
    program_overview: ReviewSectionSchema,
    student_success_outcomes: ReviewSectionSchema,
    curriculum_review: ReviewSectionSchema,
    equity_analysis: ReviewSectionSchema,
    action_plans_goals: ReviewSectionSchema,
    resource_needs: ReviewSectionSchema,
  })
  .superRefine((sections, context) => {
    for (const key of REVIEW_SECTION_KEYS) {
      if (sections[key].key !== key) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key, "key"],
          message: `Section key must be ${key}.`,
        });
      }
    }
  });
export type ReviewSections = z.infer<typeof ReviewSectionsSchema>;

export const ReviewRecordSchema = z.object({
  id: IdSchema,
  organizationId: IdSchema,
  title: z.string().min(1).max(240),
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
  type: ReviewTypeSchema,
  status: ReviewStatusSchema,
  sections: ReviewSectionsSchema,
  submittedAt: IsoDateSchema.nullable(),
  revision: z.number().int().nonnegative(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});
export type ReviewRecord = z.infer<typeof ReviewRecordSchema>;

export const ActionPlanStatusSchema = z.enum([
  "not_started",
  "ongoing",
  "complete",
  "institutionalized",
]);
export type ActionPlanStatus = z.infer<typeof ActionPlanStatusSchema>;
export const ActionPlanSchema = z.object({
  id: IdSchema,
  reviewId: IdSchema,
  organizationId: IdSchema,
  initiativeId: IdSchema,
  title: z.string().min(1).max(240),
  description: z.string().min(1).max(4_000),
  owner: z.string().min(1).max(160),
  dueDate: z.string().date(),
  status: ActionPlanStatusSchema,
  addressesEquityGap: z.boolean(),
  equityJustification: z.string().max(2_000),
  revision: z.number().int().nonnegative(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
}).superRefine((value, context) => {
  if (value.addressesEquityGap && !value.equityJustification.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["equityJustification"],
      message: "An equity-gap action plan requires a justification.",
    });
  }
});
export type ActionPlan = z.infer<typeof ActionPlanSchema>;

export const ObjectCodeSeriesSchema = z.enum([
  "1000",
  "2000",
  "3000",
  "4000",
  "5000",
  "6000",
]);
export type ObjectCodeSeries = z.infer<typeof ObjectCodeSeriesSchema>;
export const ResourceRequestSchema = z.object({
  id: IdSchema,
  reviewId: IdSchema,
  actionPlanId: IdSchema.nullable(),
  organizationId: IdSchema,
  title: z.string().min(1).max(240),
  rationale: z.string().min(1).max(4_000),
  objectCodeSeries: ObjectCodeSeriesSchema,
  amountCents: z.number().int().nonnegative(),
  priority: z.number().int().min(1),
  status: z.enum(["requested", "recommended", "funded", "declined"]),
  revision: z.number().int().nonnegative(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});
export type ResourceRequest = z.infer<typeof ResourceRequestSchema>;

export const AnalyticsSnapshotSchema = z.object({
  id: IdSchema,
  organizationId: IdSchema,
  academicYear: z.string().regex(/^\d{4}-\d{2}$/),
  enrollment: z.number().int().nonnegative(),
  completions: z.number().int().nonnegative(),
  successfulEnrollments: z.number().int().nonnegative(),
  attemptedEnrollments: z.number().int().nonnegative(),
  equityGroup: z.string().min(1).max(100),
  equityGroupSuccessful: z.number().int().nonnegative(),
  equityGroupAttempted: z.number().int().nonnegative(),
  sloAssessed: z.number().int().nonnegative(),
  sloMet: z.number().int().nonnegative(),
  activeCourses: z.number().int().nonnegative(),
  updatedAt: IsoDateSchema,
});
export type AnalyticsSnapshot = z.infer<typeof AnalyticsSnapshotSchema>;

export const ActivityRecordSchema = z.object({
  id: IdSchema,
  entityType: z.enum([
    "workspace",
    "review",
    "action_plan",
    "resource_request",
    "chat",
  ]),
  entityId: IdSchema,
  action: z.string().min(1).max(100),
  summary: z.string().min(1).max(500),
  occurredAt: IsoDateSchema,
});
export type ActivityRecord = z.infer<typeof ActivityRecordSchema>;

export const PreferenceRecordSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
  updatedAt: IsoDateSchema,
});
export type PreferenceRecord = z.infer<typeof PreferenceRecordSchema>;

export const ChatThreadSchema = z.object({
  id: IdSchema,
  title: z.string().min(1).max(200),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});
export type ChatThread = z.infer<typeof ChatThreadSchema>;

export const ChatMessageSchema = z.object({
  id: IdSchema,
  threadId: IdSchema,
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(20_000),
  model: z.string().max(200).nullable(),
  requestId: z.string().max(200).nullable(),
  createdAt: IsoDateSchema,
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const MetaRecordSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
  updatedAt: IsoDateSchema,
});
export type MetaRecord = z.infer<typeof MetaRecordSchema>;

export const WorkspaceDataSchema = z.object({
  organizations: z.array(OrganizationSchema),
  strategicInitiatives: z.array(StrategicInitiativeSchema),
  reviews: z.array(ReviewRecordSchema),
  actionPlans: z.array(ActionPlanSchema),
  resourceRequests: z.array(ResourceRequestSchema),
  analyticsSnapshots: z.array(AnalyticsSnapshotSchema),
  activities: z.array(ActivityRecordSchema),
  preferences: z.array(PreferenceRecordSchema),
  chatThreads: z.array(ChatThreadSchema),
  chatMessages: z.array(ChatMessageSchema),
});
export type WorkspaceData = z.infer<typeof WorkspaceDataSchema>;

export const WorkspaceExportSchema = z.object({
  format: z.literal(WORKSPACE_FORMAT),
  schemaVersion: z.literal(SCHEMA_VERSION),
  seedVersion: z.literal(SEED_VERSION),
  appVersion: z.string().min(1).max(100),
  exportedAt: IsoDateSchema,
  data: WorkspaceDataSchema,
});
export type WorkspaceExport = z.infer<typeof WorkspaceExportSchema>;

export const REVIEW_SECTION_TITLES: Record<ReviewSectionKey, string> = {
  program_overview: "Program Overview",
  student_success_outcomes: "Student Success & Outcomes",
  curriculum_review: "Curriculum Review",
  equity_analysis: "Equity Analysis",
  action_plans_goals: "Action Plans & Goals",
  resource_needs: "Resource Needs",
};

export function createEmptyReviewSections(now: string): ReviewSections {
  return Object.fromEntries(
    REVIEW_SECTION_KEYS.map((key) => [
      key,
      {
        key,
        title: REVIEW_SECTION_TITLES[key],
        contentHtml: "",
        status: "not_started" as const,
        acceptedAiDrafts: [],
        updatedAt: now,
      },
    ]),
  ) as unknown as ReviewSections;
}
