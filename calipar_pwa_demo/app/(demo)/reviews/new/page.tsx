"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { PageHeading } from "@/components/page-heading";
import { useWorkspace } from "@/components/workspace-provider";
import { createReview } from "@/lib/db/repository";
import type { ReviewType } from "@/lib/domain/types";

export default function NewReviewPage() {
  const router = useRouter();
  const { state } = useWorkspace();
  const programs = state.status === "ready" ? state.derived.programs : [];
  // `programs` is empty until the workspace snapshot is ready, so state holds
  // only the visitor's override and the effective program is derived. Latching
  // the first program at mount would pin this to "" forever on a slow snapshot.
  const [chosenProgram, setChosenProgram] = useState("");
  const program = chosenProgram || programs[0]?.id || "";
  const [title, setTitle] = useState("2025–26 Annual Program Review");
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [type, setType] = useState<ReviewType>("annual");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const review = await createReview({
        organizationId: program,
        title,
        academicYear,
        type,
      });
      router.push(`/reviews/editor/?id=${encodeURIComponent(review.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The review could not be created.");
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeading
        eyebrow="PROGRAM REVIEW · NEW"
        title="Start a program review"
        description="Choose the program and review cycle. CALIPAR will create a local draft with the six required sections."
      />
      <form className="form-card" onSubmit={submit}>
        <div className="form-intro">
          <span className="form-number">01</span>
          <div><h2>Review coordinates</h2><p>These details can be changed while the review remains a draft.</p></div>
        </div>
        <div className="form-grid">
          <label className="field field-wide">
            <span>Review title</span>
            <input data-testid="review-title" required maxLength={240} value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="field">
            <span>Program</span>
            <select data-testid="review-program" required value={program} onChange={(event) => setChosenProgram(event.target.value)}>
              {programs.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Academic year</span>
            <select required value={academicYear} onChange={(event) => setAcademicYear(event.target.value)}>
              <option value="2025-26">2025–26</option>
              <option value="2026-27">2026–27</option>
            </select>
          </label>
          <fieldset className="review-type-field field-wide">
            <legend>Review type</legend>
            <label className={type === "annual" ? "selected" : ""}>
              <input data-testid="review-type" type="radio" name="type" value="annual" checked={type === "annual"} onChange={() => setType("annual")} />
              <span><strong>Annual review</strong><small>A focused reflection on progress, outcomes, and immediate priorities.</small></span>
            </label>
            <label className={type === "comprehensive" ? "selected" : ""}>
              <input type="radio" name="type" value="comprehensive" checked={type === "comprehensive"} onChange={() => setType("comprehensive")} />
              <span><strong>Comprehensive review</strong><small>A broader multi-year examination of program direction and impact.</small></span>
            </label>
          </fieldset>
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="form-actions">
          <Link className="button button-ghost" href="/reviews/">Cancel</Link>
          <button className="button button-primary" data-testid="create-review" disabled={saving || !programs.length} type="submit">
            {saving ? "Creating…" : "Create local draft"} <Icon name="arrow" />
          </button>
        </div>
      </form>
    </div>
  );
}
