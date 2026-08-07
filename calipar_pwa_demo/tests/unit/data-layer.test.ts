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
  submitReview,
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
  ReviewRecordSchema,
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

  it("coalesces an editing session into one activity record", async () => {
    // review-editor.tsx:129 autosaves on a 700ms debounce, so appending gave
    // one feed entry per typing pause and buried every other record type.
    const seeded = (await listReviews(database))[0];
    expect(seeded).toBeDefined();
    const before = await database.activities
      .where("entityId")
      .equals(seeded!.id)
      .filter((r) => r.action === "review.updated")
      .count();

    let revision = seeded!.revision;
    for (let save = 0; save < 4; save += 1) {
      const saved = await updateReview(
        seeded!.id,
        { sections: seeded!.sections },
        revision,
        database,
      );
      revision = saved.revision;
    }

    const after = await database.activities
      .where("entityId")
      .equals(seeded!.id)
      .filter((r) => r.action === "review.updated")
      .count();
    expect(after).toBe(before + 1);
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

  it("holds imports to the same organization rule the write path enforces", async () => {
    // `createReview` refuses any organization that is not type "program". The
    // import path checks only that the organization *exists*. Import is the one
    // path a visitor can feed arbitrary data through, so the looser of the two
    // is the one that matters.
    const baseline = await exportWorkspace("baseline", database);
    const institution = baseline.data.organizations.find(
      (organization) => organization.type === "institution",
    );
    expect(institution).toBeDefined();

    // The write path's answer, for comparison.
    await expect(
      createReview(
        {
          organizationId: institution!.id,
          title: "Institution-level review",
          academicYear: "2025-26",
          type: "annual",
        },
        database,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });

    // Move the review AND everything that references it, so the graph stays
    // otherwise consistent and the only rule broken is the organization type.
    // Without this the plans and requests would fail the organizationId
    // equality check instead, and the test would pass for the wrong reason.
    const drifted = structuredClone(baseline);
    const review = drifted.data.reviews[0]!;
    review.organizationId = institution!.id;
    for (const plan of drifted.data.actionPlans) {
      if (plan.reviewId === review.id) plan.organizationId = institution!.id;
    }
    for (const request of drifted.data.resourceRequests) {
      if (request.reviewId === review.id) {
        request.organizationId = institution!.id;
      }
    }

    await expect(importWorkspace(drifted, database)).rejects.toMatchObject({
      code: "IMPORT_REFERENTIAL_INTEGRITY",
    } satisfies Partial<WorkspaceError>);
  });

  it("catches a plan or request on a non-existent organization transitively", async () => {
    // The import graph check never looks up `plan.organizationId` in the
    // organization set directly, which reads like a gap next to the write path.
    // It is not: the plan must agree with its review's organization, and the
    // review's organization must be a real program. Pinned here so nobody
    // deletes the equality check as redundant — it is load-bearing.
    const baseline = await exportWorkspace("baseline", database);

    const driftedPlan = structuredClone(baseline);
    driftedPlan.data.actionPlans[0]!.organizationId = "org-does-not-exist";
    await expect(importWorkspace(driftedPlan, database)).rejects.toMatchObject({
      code: "IMPORT_REFERENTIAL_INTEGRITY",
    } satisfies Partial<WorkspaceError>);

    const driftedRequest = structuredClone(baseline);
    driftedRequest.data.resourceRequests[0]!.organizationId =
      "org-does-not-exist";
    await expect(
      importWorkspace(driftedRequest, database),
    ).rejects.toMatchObject({
      code: "IMPORT_REFERENTIAL_INTEGRITY",
    } satisfies Partial<WorkspaceError>);
  });

  it("records exactly one activity per mutator, and none for the two opt-outs", async () => {
    // This is the candidate-1 workspace-commit module's job, done as a test.
    // The module was rejected because the shared part of the seven mutators is
    // a transaction frame, not a value — extracting it needs callbacks, and the
    // test it would enable ("a fake transaction was called with these tables")
    // is implementation-coupled. A `commit()` helper also never closed the hole
    // it was sold on: a new mutator can skip the helper exactly as easily as it
    // can skip an activity write. This asserts the property directly instead.
    //
    // A NEW MUTATOR MUST BE ADDED HERE. That is the point of the test.
    const timestamp = "2026-07-29T21:00:00.000Z";
    let created: string;

    const cases: { name: string; run: () => Promise<unknown>; records: 1 | 0 }[] =
      [
        {
          name: "createReview",
          records: 1,
          run: async () => {
            const review = await createReview(
              {
                organizationId: "org-biology",
                title: "Activity property review",
                academicYear: "2025-26",
                type: "annual",
              },
              database,
            );
            created = review.id;
            return review;
          },
        },
        {
          name: "updateReview",
          records: 1,
          run: () =>
            updateReview(created, { title: "Renamed once" }, undefined, database),
        },
        {
          name: "submitReview",
          records: 1,
          run: async () => {
            const draft = await database.reviews.get(created);
            const sections = structuredClone(draft!.sections);
            for (const key of REVIEW_SECTION_KEYS) {
              sections[key].status = "completed";
              sections[key].contentHtml = `<p>Completed ${key}</p>`;
            }
            await updateReview(created, { sections }, undefined, database);
            return submitReview(created, undefined, database);
          },
        },
        {
          name: "upsertActionPlan",
          records: 1,
          run: () =>
            upsertActionPlan(
              {
                id: "plan-activity-property",
                reviewId: "review-biology-2025",
                organizationId: "org-biology",
                initiativeId: "initiative-completion",
                title: "Activity property plan",
                description: "Checks that a plan write records one activity.",
                owner: "Biology Department",
                dueDate: "2027-06-30",
                status: "not_started",
                addressesEquityGap: false,
                equityJustification: "",
                revision: 0,
                createdAt: timestamp,
                updatedAt: timestamp,
              },
              undefined,
              database,
            ),
        },
        {
          name: "upsertResourceRequest",
          records: 1,
          run: () =>
            upsertResourceRequest(
              {
                id: "request-activity-property",
                reviewId: "review-biology-2025",
                actionPlanId: "plan-activity-property",
                organizationId: "org-biology",
                title: "Activity property request",
                rationale: "Checks that a request write records one activity.",
                objectCodeSeries: "2000",
                amountCents: 100_000,
                priority: 1,
                status: "requested",
                revision: 0,
                createdAt: timestamp,
                updatedAt: timestamp,
              },
              undefined,
              database,
            ),
        },
        {
          name: "deleteResourceRequest",
          records: 1,
          run: () => deleteResourceRequest("request-activity-property", database),
        },
        {
          name: "addChatThread",
          records: 1,
          run: () =>
            addChatThread(
              {
                id: "thread-activity-property",
                title: "Activity property thread",
                createdAt: timestamp,
                updatedAt: timestamp,
              },
              database,
            ),
        },
        // The two deliberate opt-outs. Both are recorded decisions, not
        // omissions: a preference is not an act a visitor would recognise, and
        // a 20-message conversation must not emit 20 feed rows — the thread
        // start already did.
        {
          name: "putPreference",
          records: 0,
          run: () => putPreference("theme", "dark", database),
        },
        {
          name: "addChatMessage",
          records: 0,
          run: () =>
            addChatMessage(
              {
                id: "message-activity-property",
                threadId: "thread-activity-property",
                role: "user",
                content: "Does this write an activity record?",
                model: null,
                requestId: null,
                createdAt: timestamp,
              },
              database,
            ),
        },
      ];

    const observed: Record<string, number> = {};
    for (const testCase of cases) {
      const before = await database.activities.count();
      await testCase.run();
      observed[testCase.name] = (await database.activities.count()) - before;
    }

    expect(observed).toEqual(
      Object.fromEntries(cases.map(({ name, records }) => [name, records])),
    );
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

  it("reports a schema failure as VALIDATION_FAILED, not as a storage outage", () => {
    // Found while writing the activity property test above: every mutator
    // reparses through a Zod schema inside `guarded`, so a ZodError hit the
    // catch-all and the visitor was told "Browser storage is unavailable. The
    // demo will not fall back to temporary memory." for what is a data problem
    // — and it sends anyone debugging it at storage instead of at the record.
    const rejected = ReviewRecordSchema.safeParse({ id: "" });
    expect(rejected.success).toBe(false);

    expect(normalizeStorageError(rejected.error)).toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });
});
