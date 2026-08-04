import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReviewEditor } from "@/components/review-editor";
import { WorkspaceStateProvider } from "@/components/workspace-provider";
import { WorkspaceError } from "@/lib/domain/errors";
import { REVIEW_SECTION_KEYS, type ReviewRecord } from "@/lib/domain/types";
import { makeReview, readyState } from "../support/workspace-fixture";

const REVIEW_ID = "review-under-test";

const searchParams = new URLSearchParams({ id: REVIEW_ID });
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

const updateReview = vi.fn();
const submitReview = vi.fn();
vi.mock("@/lib/db/repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db/repository")>()),
  updateReview: (...args: unknown[]) => updateReview(...args),
  submitReview: (...args: unknown[]) => submitReview(...args),
}));

vi.mock("@/lib/ai/client", () => ({
  expand: vi.fn(),
  AIClientError: class extends Error {},
}));

/** Every section ticked complete; `filled` of them actually have content. */
function reviewWithSections(filled: number): ReviewRecord {
  const review = makeReview();
  REVIEW_SECTION_KEYS.forEach((key, index) => {
    review.sections[key] = {
      ...review.sections[key],
      status: "completed",
      contentHtml: index < filled ? "<p>Written.</p>" : "",
    };
  });
  return review;
}

function mount(review: ReviewRecord) {
  return render(
    <WorkspaceStateProvider state={readyState({ data: { reviews: [review] } })}>
      <ReviewEditor />
    </WorkspaceStateProvider>,
  );
}

function submitButton(container: HTMLElement) {
  return container.querySelector<HTMLButtonElement>(
    '[data-testid="submit-review"]',
  );
}

describe("ReviewEditor submission gate", () => {
  afterEach(cleanup);

  it("counts a ticked but empty section as incomplete", () => {
    const view = mount(reviewWithSections(5));
    // Six sections marked complete, one of them empty. Counting status alone
    // would enable this button and then fail in the repository.
    expect(view.container.textContent).toContain("5/6 ready");
    expect(submitButton(view.container)?.disabled).toBe(true);
  });

  it("enables submission once every section has content", () => {
    const view = mount(reviewWithSections(6));
    expect(view.container.textContent).toContain("6/6 ready");
    expect(submitButton(view.container)?.disabled).toBe(false);
  });

  it("names the sections a rejected submission is waiting on", async () => {
    updateReview.mockImplementation(async () => reviewWithSections(6));
    submitReview.mockRejectedValue(
      new WorkspaceError(
        "VALIDATION_FAILED",
        "Complete every required review section before submitting.",
        {
          details: {
            valid: false,
            incompleteSections: ["equity_analysis", "resource_needs"],
          },
        },
      ),
    );

    const view = mount(reviewWithSections(6));
    fireEvent.click(submitButton(view.container)!);

    await waitFor(() => {
      expect(view.container.textContent).toContain("Equity Analysis");
    });
    const notice = view.container.textContent ?? "";
    expect(notice).toContain("Resource Needs");
    expect(notice).toContain("and");
    expect(notice).not.toContain("Complete every required review section");
  });

  it("falls back to the error message when no sections are named", async () => {
    updateReview.mockImplementation(async () => reviewWithSections(6));
    submitReview.mockRejectedValue(
      new WorkspaceError("CONFLICT", "This review changed in another tab."),
    );

    const view = mount(reviewWithSections(6));
    fireEvent.click(submitButton(view.container)!);

    await waitFor(() => {
      expect(view.container.textContent).toContain("changed in another tab");
    });
  });
});
