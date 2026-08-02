"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { useWorkspace } from "@/components/workspace-provider";
import { expand, AIClientError } from "@/lib/ai/client";
import { submitReview, updateReview } from "@/lib/db/repository";
import {
  REQUIRED_REVIEW_SECTIONS,
  validateReviewSubmission,
  type ReviewSubmissionValidation,
} from "@/lib/domain/derivations";
import { WorkspaceError } from "@/lib/domain/errors";
import {
  REVIEW_SECTION_KEYS,
  type ReviewRecord,
  type ReviewSectionKey,
  type ReviewSections,
} from "@/lib/domain/types";
import { percentWidth } from "@/lib/utils/format";
import { plainTextFromHtml } from "@/lib/utils/sanitize";

/** The sections a failed submission names, if it named any. */
function incompleteSectionNames(
  error: unknown,
  review: ReviewRecord,
): string[] {
  const details =
    error instanceof WorkspaceError && error.code === "VALIDATION_FAILED"
      ? error.details
      : undefined;
  const keys =
    typeof details === "object" &&
    details !== null &&
    "incompleteSections" in details
      ? (details as ReviewSubmissionValidation).incompleteSections
      : [];
  return keys.map((key) => review.sections[key].title);
}

function listSections(titles: string[]): string {
  return titles.length > 1
    ? `${titles.slice(0, -1).join(", ")} and ${titles.at(-1)}`
    : (titles[0] ?? "");
}

function toSafeParagraph(text: string) {
  return `<p>${text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\n", "<br>")}</p>`;
}

export function ReviewEditor() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { state } = useWorkspace();
  const source = state.status === "ready"
    ? state.data.reviews.find((item) => item.id === id)
    : undefined;
  // Navigation can land here before the workspace snapshot contains the review
  // that was just committed, so the editor must not latch its copy at mount.
  // `draft` holds local edits once they exist and otherwise defers to the
  // snapshot, which means a late-arriving review still opens the editor and a
  // later refresh never clobbers unsaved work.
  const [draft, setDraft] = useState<ReviewRecord | null>(null);
  const review = draft ?? source ?? null;
  const [active, setActive] = useState<ReviewSectionKey>("program_overview");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [notice, setNotice] = useState("");
  const [aiWorking, setAiWorking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<ReviewRecord | null>(null);

  const persist = useCallback(async (candidate?: ReviewRecord) => {
    const current = candidate ?? latest.current;
    if (!current || current.status !== "draft") return current;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setSaveState("saving");
    try {
      const saved = await updateReview(
        current.id,
        {
          title: current.title,
          academicYear: current.academicYear,
          type: current.type,
          sections: current.sections,
        },
        current.revision,
      );
      latest.current = saved;
      setDraft(saved);
      setSaveState("saved");
      return saved;
    } catch (error) {
      setSaveState("error");
      setNotice(error instanceof Error ? error.message : "The draft could not be saved.");
      return current;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const editSection = (key: ReviewSectionKey, text: string) => {
    if (!review || review.status !== "draft") return;
    const now = new Date().toISOString();
    const nextSections: ReviewSections = structuredClone(review.sections);
    nextSections[key] = {
      ...nextSections[key],
      contentHtml: toSafeParagraph(text),
      status: text.trim() ? "completed" : "not_started",
      updatedAt: now,
    };
    const next = { ...review, sections: nextSections };
    latest.current = next;
    setDraft(next);
    setSaveState("unsaved");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(next), 700);
  };

  const askForExpansion = async () => {
    if (!review || aiWorking || !navigator.onLine) return;
    const section = review.sections[active];
    const text = plainTextFromHtml(section.contentHtml);
    if (!text) {
      setNotice("Add a few notes before asking Mission-Bot to expand this section.");
      return;
    }
    setAiWorking(true);
    setNotice("");
    try {
      const result = await expand({
        content: text,
        instructions: `Draft a concise program-review narrative for ${section.title}. Preserve every supplied fact and do not invent evidence.`,
        context: [{ id: review.id, title: review.title, text: `Academic year ${review.academicYear}` }],
      });
      editSection(active, result.expandedText);
      setNotice(`Draft received from ${result.meta.model}. Review and revise it before use.`);
    } catch (error) {
      const message = error instanceof AIClientError && error.code === "AI_SESSION_REQUIRED"
        ? "Open Mission-Bot once to complete the AI consent and verification step."
        : error instanceof Error ? error.message : "Mission-Bot is unavailable.";
      setNotice(message);
    } finally {
      setAiWorking(false);
    }
  };

  const submit = async () => {
    if (!review) return;
    setNotice("");
    const saved = await persist(review);
    if (!saved) return;
    try {
      const submitted = await submitReview(saved.id, saved.revision);
      latest.current = submitted;
      setDraft(submitted);
      setNotice("Review submitted for the demo review cycle.");
    } catch (error) {
      // The repository knows which sections are short; say so rather than
      // repeating "complete every required section" over six ticked ones.
      const missing = incompleteSectionNames(error, saved);
      setNotice(
        missing.length
          ? `Add content to ${listSections(missing)} before submitting.`
          : error instanceof Error
            ? error.message
            : "The review could not be submitted.",
      );
    }
  };

  // The same predicate the repository enforces on submit: marked complete *and*
  // non-empty. Counting status alone let the button enable on a review that
  // submitReview would then reject.
  const incompleteSections = useMemo(
    () => (review ? validateReviewSubmission(review).incompleteSections : REVIEW_SECTION_KEYS.slice()),
    [review],
  );
  const completion = REQUIRED_REVIEW_SECTIONS - incompleteSections.length;
  const online = typeof navigator === "undefined" ? true : navigator.onLine;

  if (!id) {
    return (
      <div className="panel empty-state">
        <Icon name="warning" />
        <h2>No review was selected.</h2>
        <p>Return to the portfolio and choose a local review.</p>
        <Link className="button button-primary" href="/reviews/">Review portfolio</Link>
      </div>
    );
  }
  if (!review) {
    if (state.status === "ready" && !source) {
      return (
        <div className="panel empty-state">
          <Icon name="warning" />
          <h2>That review isn’t in this browser.</h2>
          <p>Local review links work only in the browser profile where they were created.</p>
          <Link className="button button-primary" href="/reviews/">Review portfolio</Link>
        </div>
      );
    }
    return <p role="status">Opening review…</p>;
  }

  const editable = review.status === "draft";
  return (
    <div className="editor-page" data-testid="review-editor">
      <header className="editor-header">
        <div>
          <Link className="back-link" href="/reviews/"><span aria-hidden="true">←</span> Review portfolio</Link>
          <p className="eyebrow">{review.academicYear} · {review.type} REVIEW</p>
          <input
            aria-label="Review title"
            className="editor-title"
            disabled={!editable}
            value={review.title}
            onChange={(event) => {
              const next = { ...review, title: event.target.value };
              latest.current = next;
              setDraft(next);
              setSaveState("unsaved");
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => void persist(next), 700);
            }}
          />
        </div>
        <div className="editor-header-actions">
          <span className={`save-state ${saveState}`} data-testid="autosave-status" role="status">
            {saveState === "saving" ? "Saving…" : saveState === "unsaved" ? "Unsaved changes" : saveState === "error" ? "Save failed" : "Saved locally"}
          </span>
          <button className="button button-primary" data-testid="submit-review" disabled={!editable || incompleteSections.length > 0 || saveState === "saving"} type="button" onClick={() => void submit()}>
            Submit review
          </button>
        </div>
      </header>
      <div className="editor-progress" aria-label={`${completion} of ${REQUIRED_REVIEW_SECTIONS} review sections complete`}>
        <div><i style={{ width: percentWidth(completion, REQUIRED_REVIEW_SECTIONS) }} /></div>
        <span>{completion}/{REQUIRED_REVIEW_SECTIONS} ready</span>
      </div>

      <div className="editor-layout">
        <nav className="section-rail" aria-label="Review sections">
          <p className="eyebrow">REVIEW SECTIONS</p>
          {REVIEW_SECTION_KEYS.map((key, index) => {
            const section = review.sections[key];
            return (
              <button className={active === key ? "active" : ""} key={key} type="button" onClick={() => setActive(key)}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{section.title}</strong>
                {section.status === "completed" ? <Icon name="check" /> : null}
              </button>
            );
          })}
        </nav>
        <section className="editor-canvas" aria-labelledby={`section-${active}`}>
          <div className="editor-canvas-head">
            <div>
              <p className="eyebrow">SECTION {String(REVIEW_SECTION_KEYS.indexOf(active) + 1).padStart(2, "0")}</p>
              <h1 id={`section-${active}`}>{review.sections[active].title}</h1>
              <p>{sectionPrompts[active]}</p>
            </div>
            <button className="button button-ghost ai-action" disabled={!editable || aiWorking || !online} type="button" onClick={() => void askForExpansion()}>
              <Icon name="spark" /> {aiWorking ? "Drafting…" : "Help me draft"}
            </button>
          </div>
          {notice ? <div className="editor-notice" role="status">{notice}</div> : null}
          <label className="editor-field">
            <span className="sr-only">{review.sections[active].title} narrative</span>
            <textarea
              aria-describedby={`guidance-${active}`}
              data-testid={active === "program_overview" ? "review-section-overview" : `review-section-${active.replaceAll("_", "-")}`}
              disabled={!editable}
              placeholder="Begin with what the evidence shows, then explain what it means for the program…"
              value={plainTextFromHtml(review.sections[active].contentHtml)}
              onChange={(event) => editSection(active, event.target.value)}
              onBlur={() => void persist()}
            />
          </label>
          <div className="editor-guidance" id={`guidance-${active}`}>
            <Icon name="compass" />
            <p><strong>Reflection cue</strong>{guidance[active]}</p>
          </div>
          <div className="editor-foot">
            <span>{plainTextFromHtml(review.sections[active].contentHtml).split(/\s+/).filter(Boolean).length} words</span>
            <span>Workspace content stays in this browser until you explicitly use AI.</span>
          </div>
        </section>
      </div>
    </div>
  );
}

const sectionPrompts: Record<ReviewSectionKey, string> = {
  program_overview: "Describe the program’s purpose, community, and most important developments during this cycle.",
  student_success_outcomes: "Interpret enrollment, completion, success, and learning-outcome evidence in context.",
  curriculum_review: "Reflect on curriculum currency, sequence, modality, and alignment with student pathways.",
  equity_analysis: "Identify meaningful outcome differences and the structures that may contribute to them.",
  action_plans_goals: "Translate findings into specific, owned, time-bound improvement work.",
  resource_needs: "Explain which resources are necessary to carry the work forward and why.",
};

const guidance: Record<ReviewSectionKey, string> = {
  program_overview: "Connect purpose to the students and communities the program serves.",
  student_success_outcomes: "Name denominators and time periods; distinguish observation from explanation.",
  curriculum_review: "Point to concrete changes, gaps, and upcoming review decisions.",
  equity_analysis: "Avoid deficit framing. Focus on conditions the institution can influence.",
  action_plans_goals: "Each action should respond to a finding and have a visible measure of progress.",
  resource_needs: "Make the relationship between the request, action plan, and expected result explicit.",
};
