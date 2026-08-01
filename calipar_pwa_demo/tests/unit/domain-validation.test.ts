import { describe, expect, it } from "vitest";

import {
  ActionPlanSchema,
  ResourceRequestSchema,
  WorkspaceExportSchema,
} from "@/lib/domain/types";
import { createDemoSeed } from "@/lib/seed/data";

const timestamp = "2026-07-29T20:00:00.000Z";

describe("domain validation", () => {
  it("requires a justification when an action plan addresses an equity gap", () => {
    const result = ActionPlanSchema.safeParse({
      id: "plan-test",
      reviewId: "review-biology-2025",
      organizationId: "org-biology",
      initiativeId: "initiative-equitable-success",
      title: "Test equity plan",
      description: "A synthetic test plan.",
      owner: "Biology",
      dueDate: "2027-06-30",
      status: "not_started",
      addressesEquityGap: true,
      equityJustification: " ",
      revision: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["equityJustification"]);
  });

  it("rejects fractional money and invalid object-code series", () => {
    const base = {
      id: "resource-test",
      reviewId: "review-biology-2025",
      actionPlanId: null,
      organizationId: "org-biology",
      title: "Test request",
      rationale: "A synthetic test request.",
      objectCodeSeries: "7000",
      amountCents: 100.5,
      priority: 0,
      status: "requested",
      revision: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const result = ResourceRequestSchema.safeParse(base);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map(({ path }) => path[0])).toEqual(
      expect.arrayContaining([
        "objectCodeSeries",
        "amountCents",
        "priority",
      ]),
    );
  });

  it("does not accept an arbitrary object as a workspace backup", () => {
    expect(
      WorkspaceExportSchema.safeParse({
        format: "not-calipar",
        schemaVersion: 1,
        data: createDemoSeed(),
      }).success,
    ).toBe(false);
  });
});
