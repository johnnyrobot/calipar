"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { PageHeading } from "@/components/page-heading";
import { useWorkspace } from "@/components/workspace-provider";
import { percentWidth } from "@/lib/utils/format";

export default function ReviewsPage() {
  const { state } = useWorkspace();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const derived = state.status === "ready" ? state.derived : null;
  // Search text is typed here and exists nowhere else, so this filter cannot be
  // derived from the workspace. Everything it filters already is.
  const reviews = useMemo(() => {
    if (!derived) return [];
    return derived.reviews.filter(
      (review) =>
        `${review.title} ${review.programName}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (status === "all" || review.status === status),
    );
  }, [derived, query, status]);
  if (!derived) return null;

  return (
    <div>
      <PageHeading
        eyebrow="PROGRAM REVIEW"
        title="Program reviews"
        description="Draft, refine, and submit program reflections that connect evidence to action."
        actions={
          <Link className="button button-primary" data-testid="new-review" href="/reviews/new/">
            <Icon name="plus" /> Start a review
          </Link>
        }
      />
      <div className="filter-bar">
        <label className="search-field">
          <span className="sr-only">Search reviews</span>
          <Icon name="search" />
          <input value={query} placeholder="Search title or program" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label className="filter-select">
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="in_review">In review</option>
            <option value="validated">Validated</option>
            <option value="approved">Approved</option>
          </select>
        </label>
        <span className="result-count">{reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
      </div>
      {reviews.length ? (
        <div className="portfolio-grid">
          {reviews.map((review) => {
            return (
              <article className="portfolio-card" key={review.id}>
                <div className="portfolio-top">
                  <span className={`status-pill ${review.status.replace("_", "-")}`}>{review.status.replace("_", " ")}</span>
                  <span>{review.type}</span>
                </div>
                <p className="eyebrow">{review.programName} · {review.academicYear}</p>
                <h2>{review.title}</h2>
                <div className="portfolio-progress">
                  <div><i style={{ width: percentWidth(review.completeSections, review.requiredSections) }} /></div>
                  <span>{review.completeSections} of {review.requiredSections} sections complete</span>
                </div>
                <Link className="card-link" href={`/reviews/editor/?id=${encodeURIComponent(review.id)}`}>
                  {review.status === "draft" ? "Continue review" : "View review"} <Icon name="arrow" />
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="panel empty-state">
          <Icon name="review" />
          <h2>No reviews match that view.</h2>
          <p>Try another filter or start a new browser-local program review.</p>
          <Link className="button button-primary" href="/reviews/new/">Start a review</Link>
        </div>
      )}
    </div>
  );
}
