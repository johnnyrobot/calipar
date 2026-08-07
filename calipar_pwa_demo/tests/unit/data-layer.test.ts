import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDatabase, type CaliparDemoDB } from "@/lib/db/database";
import {
  addChatMessage,
  addChatThread,
  createReview,
  deleteResourceRequest,
  exportWorkspace,
  getPreference,
  getReview,
  importWorkspace,
  initializeWorkspace,
  listReviews,
  putPreference,
  readWorkspace,
  resetWorkspace,
  subscribeWorkspace,
  updateReview,
  upsertActionPlan,
  upsertResourceRequest,
} from "@/lib/db/repository";
import {
  deriveWorkspace,
  validateReviewSubmission,
} from "@/lib/domain/derivations";
import { normalizeStorageError, WorkspaceError } from "@/lib/domain/errors";
import {
  REVIEW_SECTION_KEYS,
  SCHEMA_VERSION,
  WorkspaceExportSchema,
} from "@/lib/domain/types";

describe("local workspace repository", () => {
  let database: CaliparDemoDB;

  beforeEach(async () => {
    database = createDatabase(`calipar-test-${crypto.randomUUID()}`);
    await initializeWorkspace(database);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("seeds exactly once with deterministic, referentially valid records", async () => {
    const first = await readWorkspace(database);
    expect(first.organizations).toHaveLength(5);
    expect(first.strategicInitiatives).toHaveLength(5);
    expect(first.reviews).toHaveLength(4);
    expect(first.actionPlans).toHaveLength(3);
    expect(first.resourceRequests).toHaveLength(4);
    expect(first.activities).toHaveLength(10);
    expect(first.analyticsSnapshots).toHaveLength(5);

    await initializeWorkspace(database);
    const second = await readWorkspace(database);
    expect(second).toEqual(first);

    const organizationIds = new Set(first.organizations.map(({ id }) => id));
    const reviewIds = new Set(first.reviews.map(({ id }) => id));
    const initiativeIds = new Set(
      first.strategicInitiatives.map(({ id }) => id),
    );
    for (const review of first.reviews) {
      expect(organizationIds.has(review.organizationId)).toBe(true);
    }
    for (const plan of first.actionPlans) {
      expect(reviewIds.has(plan.reviewId)).toBe(true);
      expect(initiativeIds.has(plan.initiativeId)).toBe(true);
    }
  });

  it("creates a review and its audit record atomically", async () => {
    const before = await database.activities.count();
    const review = await createReview(
      {
        organizationId: "org-biology",
        title: "Biology 2026 review",
        academicYear: "2026-27",
        type: "annual",
      },
      database,
    );

    expect(review.status).toBe("draft");
    expect(review.revision).toBe(0);
    expect(Object.keys(review.sections)).toEqual(
      expect.arrayContaining([...REVIEW_SECTION_KEYS]),
    );
    expect(await database.reviews.get(review.id)).toEqual(review);
    expect(await database.activities.count()).toBe(before + 1);
    expect(
      await database.activities
        .where("entityId")
        .equals(review.id)
        .first(),
    ).toMatchObject({ action: "review.created" });
  });

  it("rejects nonexistent programs and reads reviews in recency order", async () => {
    await expect(
      createReview(
        {
          organizationId: "org-missing",
          title: "Invalid review",
          academicYear: "2026-27",
          type: "annual",
        },
        database,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });

    const reviews = await listReviews(database);
    expect(reviews).toHaveLength(4);
    expect(reviews.map(({ updatedAt }) => updatedAt)).toEqual(
      [...reviews]
        .map(({ updatedAt }) => updatedAt)
        .sort()
        .reverse(),
    );
    expect(await getReview(reviews[0]!.id, database)).toEqual(reviews[0]);
    expect(await getReview("review-missing", database)).toBeUndefined();
  });

  it("sanitizes rich text and rejects a stale revision", async () => {
    const seeded = await database.reviews.get("review-biology-2025");
    expect(seeded).toBeDefined();

    const sections = structuredClone(seeded!.sections);
    sections.program_overview.contentHtml =
      '<p>Useful</p><img src=x onerror="alert(1)"><script>alert(2)</script>';
    sections.program_overview.status = "completed";

    const saved = await updateReview(
      seeded!.id,
      { sections },
      seeded!.revision,
      database,
    );
    expect(saved.sections.program_overview.contentHtml).toContain("<p>Useful</p>");
    expect(saved.sections.program_overview.contentHtml).not.toMatch(
      /<script|<img|onerror/i,
    );

    await expect(
      updateReview(
        saved.id,
        { title: "Stale writer" },
        seeded!.revision,
        database,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" } satisfies Partial<WorkspaceError>);
  });

  it("requires all six non-empty sections before submission", async () => {
    const draft = await database.reviews.get("review-biology-2025");
    expect(draft).toBeDefined();
    const initial = validateReviewSubmission(draft!);
    expect(initial.valid).toBe(false);
    expect(initial.incompleteSections.length).toBeGreaterThan(0);

    const completed = structuredClone(draft!);
    for (const key of REVIEW_SECTION_KEYS) {
      completed.sections[key].status = "completed";
      completed.sections[key].contentHtml = `<p>Completed ${key}</p>`;
    }
    expect(validateReviewSubmission(completed)).toEqual({
      valid: true,
      incompleteSections: [],
    });
  });

  it("resets domain records to the seed while preserving preferences", async () => {
    await putPreference("theme", "dark", database);
    await database.reviews.delete("review-biology-2025");
    await database.chatThreads.add({
      id: "thread-test",
      title: "Temporary",
      createdAt: "2026-07-29T20:00:00.000Z",
      updatedAt: "2026-07-29T20:00:00.000Z",
    });

    await resetWorkspace(database);
    const workspace = await readWorkspace(database);
    expect(workspace.reviews).toHaveLength(4);
    expect(workspace.reviews.some(({ id }) => id === "review-biology-2025")).toBe(
      true,
    );
    expect(workspace.chatThreads).toHaveLength(0);
    expect(workspace.preferences).toContainEqual(
      expect.objectContaining({ key: "theme", value: "dark" }),
    );
  });

  it("creates and updates plans and resources with audit records", async () => {
    const timestamp = "2026-07-29T20:00:00.000Z";
    const plan = await upsertActionPlan(
      {
        id: "plan-unit-test",
        reviewId: "review-biology-2025",
        organizationId: "org-biology",
        initiativeId: "initiative-completion",
        title: "Test pathway milestone",
        description: "Exercise the local planning repository.",
        owner: "Biology",
        dueDate: "2027-06-30",
        status: "not_started",
        addressesEquityGap: false,
        equityJustification: "",
        revision: 99,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      undefined,
      database,
    );
    expect(plan.revision).toBe(0);

    const changedPlan = await upsertActionPlan(
      { ...plan, title: "Updated pathway milestone" },
      plan.revision,
      database,
    );
    expect(changedPlan.revision).toBe(1);
    await expect(
      upsertActionPlan(changedPlan, 0, database),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const resource = await upsertResourceRequest(
      {
        id: "resource-unit-test",
        reviewId: "review-biology-2025",
        actionPlanId: changedPlan.id,
        organizationId: "org-biology",
        title: "Test materials",
        rationale: "Exercise the local resource repository.",
        objectCodeSeries: "4000",
        amountCents: 12_345,
        priority: 3,
        status: "requested",
        revision: 42,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      undefined,
      database,
    );
    expect(resource.revision).toBe(0);

    const changedResource = await upsertResourceRequest(
      { ...resource, priority: 1 },
      resource.revision,
      database,
    );
    expect(changedResource.revision).toBe(1);
    await expect(
      upsertResourceRequest(changedResource, 0, database),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    await deleteResourceRequest(changedResource.id, database);
    expect(await database.resourceRequests.get(changedResource.id)).toBeUndefined();
    await expect(
      deleteResourceRequest(changedResource.id, database),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("records one activity per conversation, not per message", async () => {
    // The Mission-Bot filter at app/(demo)/activity/page.tsx:38 filters on the
    // "chat" entityType. Nothing ever wrote one, so the button could not match.
    const before = await database.activities.where("entityType").equals("chat").count();
    expect(before).toBe(0);

    const thread = await addChatThread(
      {
        id: "thread-activity-check",
        title: "Enrollment questions",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      database,
    );

    const afterThread = await database.activities
      .where("entityType")
      .equals("chat")
      .toArray();
    expect(afterThread).toHaveLength(1);
    expect(afterThread[0]!.summary).toContain("Enrollment questions");

    // Three messages must not add three more records.
    for (const text of ["first", "second", "third"]) {
      await addChatMessage(
        {
          id: `msg-${text}`,
          threadId: thread.id,
          role: "user",
          content: text,
          model: null,
          requestId: null,
          createdAt: new Date().toISOString(),
        },
        database,
      );
    }
    const afterMessages = await database.activities
      .where("entityType")
      .equals("chat")
      .count();
    expect(afterMessages).toBe(1);
  });

  it("surfaces a storage failure as a WorkspaceErrorCode, not a raw DOMException", async () => {
    // A DOMException *is* an Error, and review-editor.tsx:103 renders
    // error.message, so before this an out-of-space save showed the visitor the
    // raw browser string instead of the authored copy in lib/domain/errors.ts.
    const seeded = (await listReviews(database))[0];
    expect(seeded).toBeDefined();
    const quota = Object.assign(new Error("out of space"), {
      name: "QuotaExceededError",
    });
    const transaction = vi
      .spyOn(database, "transaction")
      .mockRejectedValueOnce(quota as never);

    await expect(
      updateReview(seeded!.id, { sections: seeded!.sections }, undefined, database),
    ).rejects.toMatchObject({ code: "STORAGE_QUOTA_EXCEEDED" });

    transaction.mockRestore();
  });

  it("lets a deliberate domain error through the storage guard untouched", async () => {
    // normalizeStorageError is identity on WorkspaceError. If that ever stops
    // holding, every CONFLICT and VALIDATION_FAILED silently becomes a storage
    // code, so the guard needs a test that it does not over-normalise.
    await expect(
      updateReview("review-does-not-exist", { sections: {} as never }, undefined, database),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("does not resurrect a resource request deleted in another tab", async () => {
    // The multi-tab case the revision guard exists for. Tab A holds a request
    // at revision 0; tab B deletes it. Tab A then saves. Guarding the revision
    // check on `existing` skipped it entirely once the record was gone, so the
    // save landed as a create at revision 0 and the delete was silently undone.
    const request = await database.resourceRequests.get("resource-biology-tutors");
    expect(request).toBeDefined();
    const stale = { ...request!, amountCents: request!.amountCents + 100_000 };

    await deleteResourceRequest(stale.id, database);
    expect(await database.resourceRequests.get(stale.id)).toBeUndefined();

    await expect(
      upsertResourceRequest(stale, stale.revision, database),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      details: { expectedRevision: stale.revision, actualRevision: null },
    });
    expect(await database.resourceRequests.get(stale.id)).toBeUndefined();
  });

  it("still creates a resource request when no revision is expected", async () => {
    // The strict guard must not break the create path: callers that omit
    // `expectedRevision` are stating no claim about a stored version.
    const request = await database.resourceRequests.get("resource-biology-tutors");
    const fresh = { ...request!, id: "resource-brand-new", revision: 0 };
    await deleteResourceRequest(request!.id, database);

    const created = await upsertResourceRequest(fresh, undefined, database);
    expect(created.id).toBe("resource-brand-new");
  });

  it("rejects inconsistent plan and resource relationships", async () => {
    const existingPlan = await database.actionPlans.get("plan-biology-tutoring");
    const existingResource = await database.resourceRequests.get(
      "resource-biology-tutors",
    );
    expect(existingPlan).toBeDefined();
    expect(existingResource).toBeDefined();

    await expect(
      upsertActionPlan(
        { ...existingPlan!, organizationId: "org-english" },
        existingPlan!.revision,
        database,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });

    await expect(
      upsertResourceRequest(
        {
          ...existingResource!,
          id: "resource-invalid-relationship",
          reviewId: "review-english-2024",
        },
        undefined,
        database,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("persists preferences and chat only when the thread exists", async () => {
    expect(await getPreference("missing", "fallback", database)).toBe("fallback");
    await putPreference("density", "compact", database);
    expect(await getPreference("density", "comfortable", database)).toBe(
      "compact",
    );

    const thread = await addChatThread(
      {
        id: "thread-unit-test",
        title: "Unit test thread",
        createdAt: "2026-07-29T20:00:00.000Z",
        updatedAt: "2026-07-29T20:00:00.000Z",
      },
      database,
    );
    const message = await addChatMessage(
      {
        id: "message-unit-test",
        threadId: thread.id,
        role: "user",
        content: "Use only the selected synthetic facts.",
        model: null,
        requestId: null,
        createdAt: "2026-07-29T20:01:00.000Z",
      },
      database,
    );
    expect(await database.chatMessages.get(message.id)).toEqual(message);
    expect((await database.chatThreads.get(thread.id))?.updatedAt).toBe(
      message.createdAt,
    );

    await expect(
      addChatMessage(
        {
          ...message,
          id: "message-orphan",
          threadId: "thread-missing",
        },
        database,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("publishes local workspace events and supports unsubscription", async () => {
    const received: string[] = [];
    const unsubscribe = subscribeWorkspace((change) => {
      received.push(change.type);
    });
    await putPreference("appearance", "light", database);
    expect(received).toContain("preference.changed");

    unsubscribe();
    await putPreference("appearance", "dark", database);
    expect(received.filter((type) => type === "preference.changed")).toHaveLength(
      1,
    );
  });

  it("exports and transactionally imports a valid version-one workspace", async () => {
    const exported = await exportWorkspace("test-build", database);
    expect(WorkspaceExportSchema.parse(exported)).toEqual(exported);
    expect(exported.schemaVersion).toBe(SCHEMA_VERSION);

    const replacement = structuredClone(exported);
    replacement.data.reviews = replacement.data.reviews.slice(0, 1);
    replacement.data.actionPlans = replacement.data.actionPlans.filter(
      ({ reviewId }) => reviewId === replacement.data.reviews[0]?.id,
    );
    const retainedPlanIds = new Set(
      replacement.data.actionPlans.map(({ id }) => id),
    );
    replacement.data.resourceRequests =
      replacement.data.resourceRequests.filter(
        ({ reviewId, actionPlanId }) =>
          reviewId === replacement.data.reviews[0]?.id &&
          (actionPlanId === null || retainedPlanIds.has(actionPlanId)),
      );

    const imported = await importWorkspace(JSON.stringify(replacement), database);
    expect(imported.data.reviews).toHaveLength(1);
    expect((await readWorkspace(database)).reviews).toHaveLength(1);
  });

  it("rejects future versions and bad references without changing data", async () => {
    const baseline = await exportWorkspace("baseline", database);
    const future = { ...baseline, schemaVersion: SCHEMA_VERSION + 1 };
    await expect(importWorkspace(future, database)).rejects.toMatchObject({
      code: "IMPORT_VERSION_UNSUPPORTED",
    } satisfies Partial<WorkspaceError>);

    const invalid = structuredClone(baseline);
    invalid.data.reviews[0]!.organizationId = "org-missing";
    await expect(importWorkspace(invalid, database)).rejects.toMatchObject({
      code: "IMPORT_REFERENTIAL_INTEGRITY",
    } satisfies Partial<WorkspaceError>);

    const after = await exportWorkspace("after", database);
    expect(after.data).toEqual(baseline.data);
  });

  it("rejects malformed JSON and schema-invalid imports", async () => {
    await expect(importWorkspace("{", database)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
    await expect(
      importWorkspace({ format: "not-calipar" }, database),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("derives counts and resource amounts from repository data", async () => {
    const derived = deriveWorkspace(await readWorkspace(database));
    expect(derived.totalReviews).toBe(
      Object.values(derived.reviewCounts).reduce((sum, value) => sum + value, 0),
    );

    const stored = await database.resourceRequests.toArray();
    const sum = (statuses: string[]) =>
      stored
        .filter(({ status }) => statuses.includes(status))
        .reduce((total, { amountCents }) => total + amountCents, 0);
    expect(derived.awaitingDecisionAmountCents).toBe(
      sum(["requested", "recommended"]),
    );
    expect(derived.totalRequestAmountCents).toBe(
      sum(["requested", "recommended", "funded", "declined"]),
    );
    expect(derived.fundedAmountCents).toBe(sum(["funded"]));
    expect(derived.latestAnalytics?.attemptedEnrollments).toBeTypeOf("number");
  });

  it("normalizes browser storage failures without leaking implementation errors", () => {
    expect(normalizeStorageError(new DOMException("full", "QuotaExceededError"))).toMatchObject({
      code: "STORAGE_QUOTA_EXCEEDED",
    });
    expect(normalizeStorageError(new DOMException("blocked", "VersionError"))).toMatchObject({
      code: "STORAGE_BLOCKED",
    });
    expect(normalizeStorageError(new DOMException("bad", "ConstraintError"))).toMatchObject({
      code: "STORAGE_CORRUPT",
    });
    expect(normalizeStorageError(new Error("unknown"))).toMatchObject({
      code: "STORAGE_UNAVAILABLE",
    });
    const known = new WorkspaceError("NOT_FOUND", "Known");
    expect(normalizeStorageError(known)).toBe(known);
  });
});
