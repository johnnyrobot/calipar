"use client";

import { useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/icon";
import { PageHeading } from "@/components/page-heading";
import { useWorkspace } from "@/components/workspace-provider";

const entityIcons: Record<string, IconName> = {
  review: "review",
  action_plan: "plan",
  resource_request: "resource",
  chat: "message",
  workspace: "refresh",
};

export default function ActivityPage() {
  const { state } = useWorkspace();
  const [filter, setFilter] = useState("all");
  const data = state.status === "ready" ? state.data : null;
  const activities = useMemo(
    () => data?.activities.filter((item) => filter === "all" || item.entityType === filter) ?? [],
    [data, filter],
  );
  if (!data) return null;
  return (
    <div>
      <PageHeading
        eyebrow="LOCAL AUDIT TRAIL"
        title="How the work moved"
        description="Every meaningful browser-local change creates a plain-language activity record."
      />
      <div className="activity-filter" role="group" aria-label="Filter activity">
        {([
          ["all", "Everything"],
          ["review", "Reviews"],
          ["action_plan", "Plans"],
          ["resource_request", "Resources"],
          ["chat", "Mission-Bot"],
        ] as const).map(([value, label]) => <button aria-pressed={filter === value} className={filter === value ? "active" : ""} key={value} type="button" onClick={() => setFilter(value)}>{label}</button>)}
      </div>
      <section className="panel activity-timeline">
        <ol>
          {activities.map((activity, index) => (
            <li key={activity.id}>
              <span className="timeline-icon"><Icon name={entityIcons[activity.entityType] ?? "activity"} /></span>
              <div>
                <span className="timeline-date">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(activity.occurredAt))}</span>
                <h2>{activity.summary}</h2>
                <p>{activity.action.replaceAll(".", " · ").replaceAll("_", " ")}</p>
              </div>
              <em>{String(activities.length - index).padStart(2, "0")}</em>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
