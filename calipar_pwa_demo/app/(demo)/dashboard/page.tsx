"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHeading } from "@/components/page-heading";
import { useWorkspace } from "@/components/workspace-provider";
import { formatCurrency, formatPercent, percentWidth } from "@/lib/utils/format";

function ago(iso: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default function DashboardPage() {
  const { state } = useWorkspace();
  if (state.status !== "ready") return null;
  const { data, derived } = state;
  const { readiness } = derived;

  return (
    <div className="dashboard-page">
      <PageHeading
        description="A live view of the reviews, plans, and resource choices taking shape in this browser."
        eyebrow="2025–26 · PROGRAM REVIEW LEAD"
        testId="dashboard-heading"
        title="Your review horizon"
        actions={
          <Link className="button button-primary" data-testid="new-review" href="/reviews/new/">
            <Icon name="plus" /> Start a review
          </Link>
        }
      />

      <section aria-label="Workspace overview" className="stat-grid">
        <article className="stat-card stat-dark">
          <span className="stat-label">OPEN REVIEWS</span>
          <strong>{derived.openReviewCount}</strong>
          <p><span>{derived.reviewCounts.in_review}</span> awaiting review</p>
          <Icon name="review" />
        </article>
        <article className="stat-card">
          <span className="stat-label">AVERAGE READINESS</span>
          <strong>{formatPercent(readiness.completeSections, readiness.requiredSections, 0)}</strong>
          <div className="stat-meter"><i style={{ width: percentWidth(readiness.completeSections, readiness.requiredSections) }} /></div>
          <p>{readiness.completeSections} of {readiness.requiredSections} review sections complete</p>
        </article>
        <article className="stat-card">
          <span className="stat-label">ACTION PLANS</span>
          <strong>{derived.openActionPlanCount}</strong>
          <p><span>{derived.equityGapPlanCount}</span> address an equity gap</p>
          <Icon name="plan" />
        </article>
        <article className="stat-card">
          <span className="stat-label">RESOURCE PIPELINE</span>
          <strong>{formatCurrency(derived.awaitingDecisionAmountCents)}</strong>
          <p>{derived.awaitingDecisionCount} requests awaiting decision</p>
          <Icon name="resource" />
        </article>
      </section>

      <section className="dashboard-grid">
        <div className="panel review-focus">
          <div className="panel-head">
            <div><p className="eyebrow">CONTINUE THE WORK</p><h2>Recently worked on</h2></div>
            <Link className="text-link" href="/reviews/">View all <Icon name="arrow" /></Link>
          </div>
          <div className="review-stack">
            {derived.reviews.slice(0, 4).map((review) => {
              return (
                <Link className="review-row" href={`/reviews/editor/?id=${encodeURIComponent(review.id)}`} key={review.id}>
                  <div className="review-monogram" aria-hidden="true">{review.programName.slice(0, 2).toUpperCase()}</div>
                  <div className="review-row-copy">
                    <span>{review.programName} · {review.academicYear}</span>
                    <strong>{review.title}</strong>
                    <div className="row-progress"><i style={{ width: percentWidth(review.completeSections, review.requiredSections) }} /></div>
                  </div>
                  <div className="review-row-meta">
                    <span className={`status-pill ${review.status.replace("_", "-")}`}>{review.status.replace("_", " ")}</span>
                    <small>{review.completeSections}/{review.requiredSections} sections</small>
                  </div>
                  <Icon name="chevron" />
                </Link>
              );
            })}
          </div>
        </div>

        <aside className="panel signal-card">
          <div className="signal-icon"><Icon name="spark" /></div>
          <p className="eyebrow">SIGNAL FROM YOUR DATA</p>
          <h2>
            {derived.latestAnalytics
              ? `${formatPercent(derived.latestAnalytics.successfulEnrollments, derived.latestAnalytics.attemptedEnrollments)} course success`
              : "Your latest outcomes are ready"}
          </h2>
          <p>
            Mission-Bot can help turn selected synthetic evidence into a concise
            reflection. You decide what context is sent and what prose is accepted.
          </p>
          <Link className="button button-ghost" href="/chat/">
            Explore with Mission-Bot <Icon name="arrow" />
          </Link>
        </aside>
      </section>

      <section className="dashboard-grid dashboard-grid-lower">
        <div className="panel">
          <div className="panel-head">
            <div><p className="eyebrow">RECENT MOVEMENT</p><h2>Workspace activity</h2></div>
            <Link className="text-link" href="/activity/">Full history</Link>
          </div>
          <ol className="activity-list">
            {data.activities.slice(0, 5).map((activity) => (
              <li key={activity.id}>
                <span className="activity-mark"><Icon name={activity.entityType === "review" ? "review" : activity.entityType === "action_plan" ? "plan" : "activity"} /></span>
                <div><strong>{activity.summary}</strong><span>{ago(activity.occurredAt)}</span></div>
              </li>
            ))}
          </ol>
        </div>
        <div className="panel initiative-panel">
          <div className="panel-head"><div><p className="eyebrow">STRATEGIC THROUGH-LINE</p><h2>Plans by institutional goal</h2></div></div>
          <div className="initiative-bars">
            {data.strategicInitiatives.slice(0, 5).map((initiative) => {
              const count = derived.planCountsByInitiative[initiative.id] ?? 0;
              return (
                <div key={initiative.id}>
                  <span>Goal {initiative.goalNumber}</span>
                  <div><i style={{ width: `${Math.max(9, count * 28)}%` }} /></div>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
