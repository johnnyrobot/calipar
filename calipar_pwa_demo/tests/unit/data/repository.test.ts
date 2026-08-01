import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Dexie from "dexie";

import { createDatabase, type CaliparDemoDB } from "@/lib/db/database";
import {
  createReview,
  deriveAnalyticsTrend,
  exportWorkspace,
  getDashboardSummary,
  getWorkspaceSnapshot,
  importWorkspace,
  initializeWorkspace,
  putPreference,
  resetWorkspace,
  submitReview,
  updateReview,
} from "@/lib/db/repository";
import { WorkspaceError } from "@/lib/domain/errors";
import { REVIEW_SECTION_KEYS } from "@/lib/domain/types";
import { createDemoSeed } from "@/lib/seed/data";

describe("local workspace repository", () => {
  let database: CaliparDemoDB;

  beforeEach(() => {
    database = createDatabase(`calipar-test-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it("seeds the exact synthetic workspace once", async () => {
    await initializeWorkspace(database);
    await initializeWorkspace(database);

    const snapshot = await getWorkspaceSnapshot(database);
    expect(snapshot.organizations).toHaveLength(5);
    expect(
      snapshot.organizations.filter(({ type }) => type === "institution"),
    ).toHaveLength(1);
    expect(
      snapshot.organizations.filter(({ type }) => type === "program"),
    ).toHaveLength(4);
    expect(snapshot.strategicInitiatives).toHaveLength(5);
    expect(snapshot.reviews).toHaveLength(4);
    expect(snapshot.actionPlans).toHaveLength(3);
    expect(snapshot.resourceRequests).toHaveLength(4);
    expect(snapshot.activities).toHaveLength(10);
    expect(snapshot.analyticsSnapshots).toHaveLength(5);
  });

  it("migrates legacy records to the current revision fields", async () => {
    const name = database.name;
    database.close();
    const legacy = new Dexie(name);
    legacy.version(1).stores({
      reviews: "&id",
      actionPlans: "&id",
      resourceRequests: "&id",
    });
    await legacy.open();
    const seed = createDemoSeed();
    const legacyReview = structuredClone(seed.reviews[0]) as Record<
      string,
      unknown
    >;
    const legacyPlan = structuredClone(seed.actionPlans[0]) as Record<
      string,
      unknown
    >;
    const legacyResource = structuredClone(
      seed.resourceRequests[0],
    ) as Record<string, unknown>;
    delete legacyReview.revision;
    delete legacyPlan.revision;
    delete legacyPlan.equityJustification;
    delete legacyResource.revision;
    await legacy.table("reviews").add(legacyReview);
    await legacy.table("actionPlans").add(legacyPlan);
    await legacy.table("resourceRequests").add(legacyResource);
    legacy.close();

    database = createDatabase(name);
    await database.open();
    expect((await database.reviews.get(String(legacyReview.id)))?.revision).toBe(
      0,
    );
    expect(
      (await database.actionPlans.get(String(legacyPlan.id)))
        ?.equityJustification,
    ).toBe("");
    expect(
      (await database.resourceRequests.get(String(legacyResource.id)))?.revision,
    ).toBe(0);
  });

  it("creates and updates a review with optimistic revision checks", async () => {
    await initializeWorkspace(database);
    const review = await createReview(
      {
        organizationId: "org-biology",
        title: "Biology 2026 Annual Review",
        academicYear: "2026-27",
        type: "annual",
      },
      database,
    );

    const changed = await updateReview(
      review.id,
      { title: "Biology 2026–27 Annual Review" },
      0,
      database,
    );
    expect(changed.revision).toBe(1);

    await expect(
      updateReview(review.id, { title: "Stale title" }, 0, database),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await database.activities.where("entityId").equals(review.id).count()).toBe(
      2,
    );
  });

  it("requires all populated completed sections before submission", async () => {
    await initializeWorkspace(database);
    const initial = await database.reviews.get("review-biology-2025");
    expect(initial).toBeDefined();

    await expect(
      submitReview("review-biology-2025", initial!.revision, database),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });

    const sections = structuredClone(initial!.sections);
    for (const key of REVIEW_SECTION_KEYS) {
      sections[key] = {
        ...sections[key],
        status: "completed",
        contentHtml: `<p>Completed ${key} narrative.</p>`,
        updatedAt: new Date().toISOString(),
      };
    }
    const ready = await updateReview(
      initial!.id,
      { sections },
      initial!.revision,
      database,
    );
    const submitted = await submitReview(
      ready.id,
      ready.revision,
      database,
    );
    expect(submitted.status).toBe("in_review");
    expect(submitted.submittedAt).not.toBeNull();
  });

  it("resets domain data while preserving preferences", async () => {
    await initializeWorkspace(database);
    await putPreference("theme", "dark", database);
    await database.reviews.delete("review-biology-2025");
    await database.chatThreads.add({
      id: "thread-test",
      title: "Temporary chat",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await resetWorkspace(database);
    const snapshot = await getWorkspaceSnapshot(database);
    expect(snapshot.reviews).toHaveLength(4);
    expect(snapshot.chatThreads).toHaveLength(0);
    expect(snapshot.preferences).toContainEqual(
      expect.objectContaining({ key: "theme", value: "dark" }),
    );
  });

  it("round-trips a replace-only export and rejects bad references atomically", async () => {
    await initializeWorkspace(database);
    const exported = await exportWorkspace("test-version", database);
    exported.data.reviews[0]!.title = "Imported title";

    const imported = await importWorkspace(exported, database);
    expect(imported.appVersion).toBe("test-version");
    expect((await database.reviews.get(exported.data.reviews[0]!.id))?.title).toBe(
      "Imported title",
    );

    const invalid = structuredClone(exported);
    invalid.data.reviews[0]!.organizationId = "missing-program";
    await expect(importWorkspace(invalid, database)).rejects.toBeInstanceOf(
      WorkspaceError,
    );
    expect((await database.reviews.get(exported.data.reviews[0]!.id))?.title).toBe(
      "Imported title",
    );
  });

  it("derives dashboard and analytics rates without inventing zero denominators", async () => {
    await initializeWorkspace(database);
    const summary = await getDashboardSummary(database);
    expect(summary.totalReviews).toBe(4);
    expect(summary.reviewCounts).toEqual({
      draft: 1,
      in_review: 1,
      validated: 1,
      approved: 1,
    });
    expect(summary.latestAnalytics?.academicYear).toBe("2025-26");
    expect(summary.latestAnalytics?.successRate).toBeCloseTo(84.06);

    const trend = deriveAnalyticsTrend([
      {
        id: "analytics-zero",
        organizationId: "org-biology",
        academicYear: "2020-21",
        enrollment: 0,
        completions: 0,
        successfulEnrollments: 0,
        attemptedEnrollments: 0,
        equityGroup: "Demo group",
        equityGroupSuccessful: 0,
        equityGroupAttempted: 0,
        sloAssessed: 0,
        sloMet: 0,
        activeCourses: 0,
        updatedAt: new Date().toISOString(),
      },
    ]);
    expect(trend[0]).toMatchObject({
      successRate: null,
      equityGroupSuccessRate: null,
      sloAttainmentRate: null,
    });
  });
});
