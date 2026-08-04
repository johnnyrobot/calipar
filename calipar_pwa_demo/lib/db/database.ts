import Dexie, { type EntityTable } from "dexie";

import type {
  ActivityRecord,
  ActionPlan,
  AnalyticsSnapshot,
  ChatMessage,
  ChatThread,
  MetaRecord,
  Organization,
  PreferenceRecord,
  ResourceRequest,
  ReviewRecord,
  StrategicInitiative,
} from "../domain/types";

export const DATABASE_NAME = "calipar-demo";
export const DATABASE_VERSION = 2;

const V1_STORES = {
  meta: "&key",
  organizations: "&id, type, parentId, code, name",
  strategicInitiatives: "&id, goalNumber, active",
  reviews: "&id, organizationId, academicYear, type, status, updatedAt",
  actionPlans:
    "&id, reviewId, organizationId, initiativeId, status, dueDate, updatedAt",
  resourceRequests:
    "&id, reviewId, actionPlanId, organizationId, status, priority, updatedAt",
  analyticsSnapshots: "&id, organizationId, academicYear, updatedAt",
  activities: "&id, entityType, entityId, action, occurredAt",
  preferences: "&key, updatedAt",
  chatThreads: "&id, updatedAt",
  chatMessages: "&id, threadId, role, createdAt",
} as const;

const V2_STORES = {
  ...V1_STORES,
  reviews:
    "&id, organizationId, academicYear, type, status, updatedAt, revision, [organizationId+status]",
  actionPlans:
    "&id, reviewId, organizationId, initiativeId, status, dueDate, updatedAt, revision, [organizationId+status]",
  resourceRequests:
    "&id, reviewId, actionPlanId, organizationId, status, priority, updatedAt, revision, [organizationId+status]",
} as const;

export class CaliparDemoDB extends Dexie {
  meta!: EntityTable<MetaRecord, "key">;
  organizations!: EntityTable<Organization, "id">;
  strategicInitiatives!: EntityTable<StrategicInitiative, "id">;
  reviews!: EntityTable<ReviewRecord, "id">;
  actionPlans!: EntityTable<ActionPlan, "id">;
  resourceRequests!: EntityTable<ResourceRequest, "id">;
  analyticsSnapshots!: EntityTable<AnalyticsSnapshot, "id">;
  activities!: EntityTable<ActivityRecord, "id">;
  preferences!: EntityTable<PreferenceRecord, "key">;
  chatThreads!: EntityTable<ChatThread, "id">;
  chatMessages!: EntityTable<ChatMessage, "id">;

  constructor(name = DATABASE_NAME) {
    super(name);

    this.version(1).stores(V1_STORES);
    this.version(DATABASE_VERSION)
      .stores(V2_STORES)
      .upgrade(async (transaction) => {
        await transaction
          .table<ReviewRecord, string>("reviews")
          .toCollection()
          .modify((record) => {
            record.revision ??= 0;
            record.submittedAt ??= null;
          });
        await transaction
          .table<ActionPlan, string>("actionPlans")
          .toCollection()
          .modify((record) => {
            record.revision ??= 0;
            record.equityJustification ??= "";
          });
        await transaction
          .table<ResourceRequest, string>("resourceRequests")
          .toCollection()
          .modify((record) => {
            record.revision ??= 0;
          });
      });

    this.on("versionchange", () => {
      this.close();
    });
  }
}

export function createDatabase(name?: string): CaliparDemoDB {
  return new CaliparDemoDB(name);
}

export const db = createDatabase();
