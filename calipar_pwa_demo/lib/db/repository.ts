import type { Table } from "dexie";

import { db as defaultDb, type CaliparDemoDB } from "./database";
import {
  ActivityRecordSchema,
  ActionPlanSchema,
  ChatMessageSchema,
  ChatThreadSchema,
  createEmptyReviewSections,
  PreferenceRecordSchema,
  ResourceRequestSchema,
  ReviewRecordSchema,
  REVIEW_SECTION_KEYS,
  SCHEMA_VERSION,
  SEED_VERSION,
  WorkspaceDataSchema,
  WorkspaceExportSchema,
  WORKSPACE_FORMAT,
  type ActivityRecord,
  type ActionPlan,
  type ChatMessage,
  type ChatThread,
  type PreferenceRecord,
  type ResourceRequest,
  type ReviewRecord,
  type WorkspaceData,
  type WorkspaceExport,
} from "../domain/types";
import { validateReviewSubmission } from "../domain/derivations";
import { normalizeStorageError, WorkspaceError } from "../domain/errors";
import { createDemoSeed } from "../seed/data";
import { sanitizeRichText } from "../utils/sanitize";

export const WORKSPACE_CHANNEL = "calipar-demo-workspace";
const META_WORKSPACE_KEY = "workspace";
const DEFAULT_APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION ?? process.env.npm_package_version ?? "0.1.0";

export type WorkspaceChangeType =
  | "initialized"
  | "review.changed"
  | "actionPlan.changed"
  | "resourceRequest.changed"
  | "chat.changed"
  | "preference.changed"
  | "reset"
  | "imported";

export interface WorkspaceChange {
  type: WorkspaceChangeType;
  entityId?: string;
  occurredAt: string;
}

export interface CreateReviewInput {
  organizationId: string;
  title: string;
  academicYear: string;
  type: ReviewRecord["type"];
}

export type UpdateReviewInput = Partial<
  Pick<ReviewRecord, "title" | "academicYear" | "type" | "sections">
>;

const localListeners = new Set<(change: WorkspaceChange) => void>();
let broadcastChannel: BroadcastChannel | null | undefined;

function nowIso(): string {
  return new Date().toISOString();
}

function getBroadcastChannel(): BroadcastChannel | null {
  if (broadcastChannel !== undefined) return broadcastChannel;
  broadcastChannel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(WORKSPACE_CHANNEL);
  return broadcastChannel;
}

function publish(change: WorkspaceChange): void {
  for (const listener of localListeners) listener(change);
  getBroadcastChannel()?.postMessage(change);
}

function createActivity(
  entityType: ActivityRecord["entityType"],
  entityId: string,
  action: string,
  summary: string,
  occurredAt = nowIso(),
): ActivityRecord {
  return ActivityRecordSchema.parse({
    id: crypto.randomUUID(),
    entityType,
    entityId,
    action,
    summary,
    occurredAt,
  });
}

function tablesForWorkspace(database: CaliparDemoDB) {
  return [
    database.organizations,
    database.strategicInitiatives,
    database.reviews,
    database.actionPlans,
    database.resourceRequests,
    database.analyticsSnapshots,
    database.activities,
    database.preferences,
    database.chatThreads,
    database.chatMessages,
  ] as const;
}

async function replaceTable<T, K>(
  table: Table<T, K>,
  records: readonly T[],
): Promise<void> {
  await table.clear();
  if (records.length) await table.bulkAdd([...records]);
}

async function writeWorkspaceData(
  database: CaliparDemoDB,
  data: WorkspaceData,
  preservePreferences: boolean,
): Promise<void> {
  const preferences = preservePreferences
    ? await database.preferences.toArray()
    : data.preferences;
  await replaceTable(database.organizations, data.organizations);
  await replaceTable(database.strategicInitiatives, data.strategicInitiatives);
  await replaceTable(database.reviews, data.reviews);
  await replaceTable(database.actionPlans, data.actionPlans);
  await replaceTable(database.resourceRequests, data.resourceRequests);
  await replaceTable(database.analyticsSnapshots, data.analyticsSnapshots);
  await replaceTable(database.activities, data.activities);
  await replaceTable(database.preferences, preferences);
  await replaceTable(database.chatThreads, data.chatThreads);
  await replaceTable(database.chatMessages, data.chatMessages);
  await database.meta.put({
    key: META_WORKSPACE_KEY,
    value: {
      schemaVersion: SCHEMA_VERSION,
      seedVersion: SEED_VERSION,
    },
    updatedAt: nowIso(),
  });
}

export async function initializeWorkspace(
  database: CaliparDemoDB = defaultDb,
): Promise<void> {
  if (typeof indexedDB === "undefined") {
    throw new WorkspaceError(
      "STORAGE_UNAVAILABLE",
      "IndexedDB is unavailable in this browser.",
    );
  }
  try {
    await database.open();
    const meta = await database.meta.get(META_WORKSPACE_KEY);
    const recordCount = await database.transaction(
      "r",
      tablesForWorkspace(database),
      async () =>
        (
          await Promise.all(
            tablesForWorkspace(database)
              .filter((table) => table !== database.preferences)
              .map((table) => table.count()),
          )
        ).reduce((sum, count) => sum + count, 0),
    );
    if (!meta && recordCount === 0) {
      const seed = createDemoSeed();
      await database.transaction(
        "rw",
        [database.meta, ...tablesForWorkspace(database)],
        () => writeWorkspaceData(database, seed, false),
      );
      publish({ type: "initialized", occurredAt: nowIso() });
    } else if (!meta) {
      await database.meta.put({
        key: META_WORKSPACE_KEY,
        value: { schemaVersion: SCHEMA_VERSION, seedVersion: SEED_VERSION },
        updatedAt: nowIso(),
      });
    }
  } catch (error) {
    throw normalizeStorageError(error);
  }
}

export async function readWorkspace(
  database: CaliparDemoDB = defaultDb,
): Promise<WorkspaceData> {
  try {
    const [
      organizations,
      strategicInitiatives,
      reviews,
      actionPlans,
      resourceRequests,
      analyticsSnapshots,
      activities,
      preferences,
      chatThreads,
      chatMessages,
    ] = await database.transaction(
      "r",
      tablesForWorkspace(database),
      () =>
        Promise.all([
          database.organizations.toArray(),
          database.strategicInitiatives.toArray(),
          database.reviews.toArray(),
          database.actionPlans.toArray(),
          database.resourceRequests.toArray(),
          database.analyticsSnapshots.toArray(),
          database.activities.orderBy("occurredAt").reverse().toArray(),
          database.preferences.toArray(),
          database.chatThreads.toArray(),
          database.chatMessages.toArray(),
        ]),
    );
    return WorkspaceDataSchema.parse({
      organizations,
      strategicInitiatives,
      reviews,
      actionPlans,
      resourceRequests,
      analyticsSnapshots,
      activities,
      preferences,
      chatThreads,
      chatMessages,
    });
  } catch (error) {
    throw normalizeStorageError(error);
  }
}

export async function listReviews(
  database: CaliparDemoDB = defaultDb,
): Promise<ReviewRecord[]> {
  return database.reviews.orderBy("updatedAt").reverse().toArray();
}

export async function getReview(
  id: string,
  database: CaliparDemoDB = defaultDb,
): Promise<ReviewRecord | undefined> {
  return database.reviews.get(id);
}

/**
 * Every workspace mutation routes through this. Without it a storage failure —
 * a quota exceeded, a blocked or corrupt database — escaped a mutator as a raw
 * DOMException and was rendered straight to the visitor, because a DOMException
 * *is* an Error and `components/review-editor.tsx:103` surfaces `error.message`.
 * The WorkspaceErrorCode union promised a closed set of error modes that only
 * the four whole-workspace paths actually honoured.
 *
 * `normalizeStorageError` is identity on WorkspaceError, so the domain errors
 * these mutators raise deliberately — CONFLICT, VALIDATION_FAILED, NOT_FOUND —
 * pass through untouched.
 */
function guarded<A extends unknown[], R>(
  run: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    try {
      return await run(...args);
    } catch (error) {
      throw normalizeStorageError(error);
    }
  };
}

async function createReviewImpl(
  input: CreateReviewInput,
  database: CaliparDemoDB = defaultDb,
): Promise<ReviewRecord> {
  const organization = await database.organizations.get(input.organizationId);
  if (!organization || organization.type !== "program") {
    throw new WorkspaceError(
      "VALIDATION_FAILED",
      "A review must belong to an existing program organization.",
    );
  }
  const timestamp = nowIso();
  const review = ReviewRecordSchema.parse({
    id: crypto.randomUUID(),
    ...input,
    status: "draft",
    sections: createEmptyReviewSections(timestamp),
    submittedAt: null,
    revision: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const activity = createActivity(
    "review",
    review.id,
    "review.created",
    `${organization.name} created ${review.title}.`,
    timestamp,
  );
  await database.transaction(
    "rw",
    database.reviews,
    database.activities,
    async () => {
      await database.reviews.add(review);
      await database.activities.add(activity);
    },
  );
  publish({ type: "review.changed", entityId: review.id, occurredAt: timestamp });
  return review;
}

function sanitizeSections(
  sections: ReviewRecord["sections"],
): ReviewRecord["sections"] {
  const result = structuredClone(sections);
  for (const key of REVIEW_SECTION_KEYS) {
    result[key].contentHtml = sanitizeRichText(result[key].contentHtml);
    result[key].acceptedAiDrafts = result[key].acceptedAiDrafts.map((draft) =>
      sanitizeRichText(draft),
    );
  }
  return result;
}

async function updateReviewImpl(
  id: string,
  patch: UpdateReviewInput,
  expectedRevision?: number,
  database: CaliparDemoDB = defaultDb,
): Promise<ReviewRecord> {
  const existing = await database.reviews.get(id);
  if (!existing) {
    throw new WorkspaceError("NOT_FOUND", "The requested review was not found.");
  }
  if (existing.status !== "draft") {
    throw new WorkspaceError(
      "VALIDATION_FAILED",
      "Only draft reviews can be edited.",
    );
  }
  if (
    expectedRevision !== undefined &&
    existing.revision !== expectedRevision
  ) {
    throw new WorkspaceError(
      "CONFLICT",
      "This review changed in another tab. Reload before saving.",
      { details: { expectedRevision, actualRevision: existing.revision } },
    );
  }
  const timestamp = nowIso();
  const next = ReviewRecordSchema.parse({
    ...existing,
    ...patch,
    sections: patch.sections
      ? sanitizeSections(patch.sections)
      : existing.sections,
    id: existing.id,
    organizationId: existing.organizationId,
    status: existing.status,
    submittedAt: existing.submittedAt,
    revision: existing.revision + 1,
    createdAt: existing.createdAt,
    updatedAt: timestamp,
  });
  const activity = createActivity(
    "review",
    id,
    "review.updated",
    `Updated ${next.title}.`,
    timestamp,
  );
  await database.transaction(
    "rw",
    database.reviews,
    database.activities,
    async () => {
      await database.reviews.put(next);
      await database.activities.add(activity);
    },
  );
  publish({ type: "review.changed", entityId: id, occurredAt: timestamp });
  return next;
}

async function submitReviewImpl(
  id: string,
  expectedRevision?: number,
  database: CaliparDemoDB = defaultDb,
): Promise<ReviewRecord> {
  const existing = await database.reviews.get(id);
  if (!existing) {
    throw new WorkspaceError("NOT_FOUND", "The requested review was not found.");
  }
  if (existing.status !== "draft") {
    throw new WorkspaceError(
      "VALIDATION_FAILED",
      "Only a draft review can be submitted.",
    );
  }
  if (expectedRevision !== undefined && existing.revision !== expectedRevision) {
    throw new WorkspaceError(
      "CONFLICT",
      "This review changed in another tab. Reload before submitting.",
      {
        details: { expectedRevision, actualRevision: existing.revision },
      },
    );
  }
  const validation = validateReviewSubmission(existing);
  if (!validation.valid) {
    throw new WorkspaceError(
      "VALIDATION_FAILED",
      "Complete every required review section before submitting.",
      { details: validation },
    );
  }
  const timestamp = nowIso();
  const next = ReviewRecordSchema.parse({
    ...existing,
    status: "in_review",
    submittedAt: timestamp,
    updatedAt: timestamp,
    revision: existing.revision + 1,
  });
  await database.transaction(
    "rw",
    database.reviews,
    database.activities,
    async () => {
      await database.reviews.put(next);
      await database.activities.add(
        createActivity(
          "review",
          id,
          "review.submitted",
          `Submitted ${next.title}.`,
          timestamp,
        ),
      );
    },
  );
  publish({ type: "review.changed", entityId: id, occurredAt: timestamp });
  return next;
}

async function upsertActionPlanImpl(
  value: ActionPlan,
  expectedRevision?: number,
  database: CaliparDemoDB = defaultDb,
): Promise<ActionPlan> {
  const existing = await database.actionPlans.get(value.id);
  // `existing?.revision` rather than a guard on `existing`: an expected revision
  // is a claim about a specific stored version, and a record that is gone
  // falsifies that claim. Guarding on `existing` treated "it was deleted in
  // another tab" as a create, silently resurrecting the record at revision 0.
  if (expectedRevision !== undefined && existing?.revision !== expectedRevision) {
    throw new WorkspaceError(
      "CONFLICT",
      "This action plan changed in another tab.",
      {
        details: {
          expectedRevision,
          actualRevision: existing?.revision ?? null,
        },
      },
    );
  }
  const [review, organization, initiative] = await Promise.all([
    database.reviews.get(value.reviewId),
    database.organizations.get(value.organizationId),
    database.strategicInitiatives.get(value.initiativeId),
  ]);
  if (
    !review ||
    !organization ||
    !initiative ||
    review.organizationId !== value.organizationId
  ) {
    throw new WorkspaceError(
      "VALIDATION_FAILED",
      "The action plan references an invalid review, organization, or initiative.",
    );
  }
  const timestamp = nowIso();
  const next = ActionPlanSchema.parse({
    ...value,
    revision: existing ? existing.revision + 1 : 0,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  });
  await database.transaction(
    "rw",
    database.actionPlans,
    database.activities,
    async () => {
      await database.actionPlans.put(next);
      await database.activities.add(
        createActivity(
          "action_plan",
          next.id,
          existing ? "plan.updated" : "plan.created",
          `${existing ? "Updated" : "Created"} ${next.title}.`,
          timestamp,
        ),
      );
    },
  );
  publish({
    type: "actionPlan.changed",
    entityId: next.id,
    occurredAt: timestamp,
  });
  return next;
}

async function upsertResourceRequestImpl(
  value: ResourceRequest,
  expectedRevision?: number,
  database: CaliparDemoDB = defaultDb,
): Promise<ResourceRequest> {
  const existing = await database.resourceRequests.get(value.id);
  // See upsertActionPlan: guarding on `existing` let a stale tab resurrect a
  // request another tab had deleted. `deleteResourceRequest` is wired to a
  // button (app/(demo)/resources/page.tsx:93), so that race is reachable.
  if (expectedRevision !== undefined && existing?.revision !== expectedRevision) {
    throw new WorkspaceError(
      "CONFLICT",
      "This resource request changed in another tab.",
      {
        details: {
          expectedRevision,
          actualRevision: existing?.revision ?? null,
        },
      },
    );
  }
  const [review, organization, actionPlan] = await Promise.all([
    database.reviews.get(value.reviewId),
    database.organizations.get(value.organizationId),
    value.actionPlanId
      ? database.actionPlans.get(value.actionPlanId)
      : Promise.resolve(undefined),
  ]);
  if (
    !review ||
    !organization ||
    review.organizationId !== value.organizationId ||
    (value.actionPlanId &&
      (!actionPlan ||
        actionPlan.reviewId !== value.reviewId ||
        actionPlan.organizationId !== value.organizationId))
  ) {
    throw new WorkspaceError(
      "VALIDATION_FAILED",
      "The resource request references an invalid review, organization, or action plan.",
    );
  }
  const timestamp = nowIso();
  const next = ResourceRequestSchema.parse({
    ...value,
    revision: existing ? existing.revision + 1 : 0,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  });
  await database.transaction(
    "rw",
    database.resourceRequests,
    database.activities,
    async () => {
      await database.resourceRequests.put(next);
      await database.activities.add(
        createActivity(
          "resource_request",
          next.id,
          existing ? "resource.updated" : "resource.created",
          `${existing ? "Updated" : "Created"} ${next.title}.`,
          timestamp,
        ),
      );
    },
  );
  publish({
    type: "resourceRequest.changed",
    entityId: next.id,
    occurredAt: timestamp,
  });
  return next;
}

async function deleteResourceRequestImpl(
  id: string,
  database: CaliparDemoDB = defaultDb,
): Promise<void> {
  const existing = await database.resourceRequests.get(id);
  if (!existing) {
    throw new WorkspaceError(
      "NOT_FOUND",
      "The requested resource request was not found.",
    );
  }
  const timestamp = nowIso();
  await database.transaction(
    "rw",
    database.resourceRequests,
    database.activities,
    async () => {
      await database.resourceRequests.delete(id);
      await database.activities.add(
        createActivity(
          "resource_request",
          id,
          "resource.deleted",
          `Deleted ${existing.title}.`,
          timestamp,
        ),
      );
    },
  );
  publish({ type: "resourceRequest.changed", entityId: id, occurredAt: timestamp });
}

async function putPreferenceImpl(
  key: string,
  value: unknown,
  database: CaliparDemoDB = defaultDb,
): Promise<PreferenceRecord> {
  const record = PreferenceRecordSchema.parse({
    key,
    value,
    updatedAt: nowIso(),
  });
  await database.preferences.put(record);
  publish({
    type: "preference.changed",
    entityId: key,
    occurredAt: record.updatedAt,
  });
  return record;
}

export async function getPreference<T>(
  key: string,
  fallback: T,
  database: CaliparDemoDB = defaultDb,
): Promise<T> {
  const record = await database.preferences.get(key);
  return (record?.value as T | undefined) ?? fallback;
}

async function addChatThreadImpl(
  value: ChatThread,
  database: CaliparDemoDB = defaultDb,
): Promise<ChatThread> {
  const thread = ChatThreadSchema.parse(value);
  await database.chatThreads.put(thread);
  publish({ type: "chat.changed", entityId: thread.id, occurredAt: thread.updatedAt });
  return thread;
}

async function addChatMessageImpl(
  value: ChatMessage,
  database: CaliparDemoDB = defaultDb,
): Promise<ChatMessage> {
  const message = ChatMessageSchema.parse(value);
  const thread = await database.chatThreads.get(message.threadId);
  if (!thread) {
    throw new WorkspaceError("VALIDATION_FAILED", "The chat thread does not exist.");
  }
  await database.transaction(
    "rw",
    database.chatMessages,
    database.chatThreads,
    async () => {
      await database.chatMessages.add(message);
      await database.chatThreads.update(thread.id, {
        updatedAt: message.createdAt,
      });
    },
  );
  publish({
    type: "chat.changed",
    entityId: message.threadId,
    occurredAt: message.createdAt,
  });
  return message;
}

export const createReview = guarded(createReviewImpl);
export const updateReview = guarded(updateReviewImpl);
export const submitReview = guarded(submitReviewImpl);
export const upsertActionPlan = guarded(upsertActionPlanImpl);
export const upsertResourceRequest = guarded(upsertResourceRequestImpl);
export const deleteResourceRequest = guarded(deleteResourceRequestImpl);
export const putPreference = guarded(putPreferenceImpl);
export const addChatThread = guarded(addChatThreadImpl);
export const addChatMessage = guarded(addChatMessageImpl);

export async function resetWorkspace(
  database: CaliparDemoDB = defaultDb,
): Promise<void> {
  const seed = createDemoSeed();
  try {
    await database.transaction(
      "rw",
      [database.meta, ...tablesForWorkspace(database)],
      () => writeWorkspaceData(database, seed, true),
    );
    publish({ type: "reset", occurredAt: nowIso() });
  } catch (error) {
    throw normalizeStorageError(error);
  }
}

export async function exportWorkspace(
  appVersion = DEFAULT_APP_VERSION,
  database: CaliparDemoDB = defaultDb,
): Promise<WorkspaceExport> {
  const data = await readWorkspace(database);
  return WorkspaceExportSchema.parse({
    format: WORKSPACE_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    seedVersion: SEED_VERSION,
    appVersion,
    exportedAt: nowIso(),
    data,
  });
}

function sanitizeImportedData(data: WorkspaceData): WorkspaceData {
  return {
    ...data,
    reviews: data.reviews.map((review) => ({
      ...review,
      sections: sanitizeSections(review.sections),
    })),
    chatMessages: data.chatMessages.map((message) => ({
      ...message,
      content: sanitizeRichText(message.content),
    })),
  };
}

function assertReferentialIntegrity(data: WorkspaceData): void {
  const organizations = new Set(data.organizations.map(({ id }) => id));
  const reviews = new Map(data.reviews.map((review) => [review.id, review]));
  const initiatives = new Set(data.strategicInitiatives.map(({ id }) => id));
  const actionPlans = new Map(data.actionPlans.map((plan) => [plan.id, plan]));
  const threads = new Set(data.chatThreads.map(({ id }) => id));

  const invalid =
    data.organizations.some(
      (organization) =>
        organization.parentId !== null &&
        !organizations.has(organization.parentId),
    ) ||
    data.reviews.some((review) => !organizations.has(review.organizationId)) ||
    data.actionPlans.some((plan) => {
      const review = reviews.get(plan.reviewId);
      return (
        !review ||
        review.organizationId !== plan.organizationId ||
        !initiatives.has(plan.initiativeId)
      );
    }) ||
    data.resourceRequests.some((request) => {
      const review = reviews.get(request.reviewId);
      const plan = request.actionPlanId
        ? actionPlans.get(request.actionPlanId)
        : undefined;
      return (
        !review ||
        review.organizationId !== request.organizationId ||
        (request.actionPlanId !== null &&
          (!plan ||
            plan.reviewId !== request.reviewId ||
            plan.organizationId !== request.organizationId))
      );
    }) ||
    data.analyticsSnapshots.some(
      (snapshot) => !organizations.has(snapshot.organizationId),
    ) ||
    data.chatMessages.some((message) => !threads.has(message.threadId));

  if (invalid) {
    throw new WorkspaceError(
      "IMPORT_REFERENTIAL_INTEGRITY",
      "The import contains missing or inconsistent record references.",
    );
  }
}

export async function importWorkspace(
  input: string | unknown,
  database: CaliparDemoDB = defaultDb,
): Promise<WorkspaceExport> {
  let raw: unknown;
  try {
    raw = typeof input === "string" ? JSON.parse(input) : input;
  } catch (error) {
    throw new WorkspaceError(
      "VALIDATION_FAILED",
      "The selected file is not valid JSON.",
      { cause: error },
    );
  }
  if (
    typeof raw === "object" &&
    raw !== null &&
    "schemaVersion" in raw &&
    raw.schemaVersion !== SCHEMA_VERSION
  ) {
    throw new WorkspaceError(
      "IMPORT_VERSION_UNSUPPORTED",
      "This workspace export uses an unsupported schema version.",
      { details: { supported: SCHEMA_VERSION, received: raw.schemaVersion } },
    );
  }

  const parsed = WorkspaceExportSchema.safeParse(raw);
  if (!parsed.success) {
    throw new WorkspaceError(
      "VALIDATION_FAILED",
      "The selected file is not a valid CALIPAR demo workspace export.",
      { details: parsed.error.flatten() },
    );
  }
  const sanitized = WorkspaceDataSchema.parse(
    sanitizeImportedData(parsed.data.data),
  );
  assertReferentialIntegrity(sanitized);

  try {
    await database.transaction(
      "rw",
      [database.meta, ...tablesForWorkspace(database)],
      () => writeWorkspaceData(database, sanitized, false),
    );
    publish({ type: "imported", occurredAt: nowIso() });
    return { ...parsed.data, data: sanitized };
  } catch (error) {
    throw normalizeStorageError(error);
  }
}

export function subscribeWorkspace(
  listener: (change: WorkspaceChange) => void,
): () => void {
  localListeners.add(listener);
  const channel = getBroadcastChannel();
  const onMessage = (event: MessageEvent<WorkspaceChange>) => {
    listener(event.data);
  };
  channel?.addEventListener("message", onMessage);
  return () => {
    localListeners.delete(listener);
    channel?.removeEventListener("message", onMessage);
  };
}
