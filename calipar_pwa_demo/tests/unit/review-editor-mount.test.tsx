import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReviewEditor } from "@/components/review-editor";
import {
  WorkspaceStateProvider,
  type WorkspaceState,
} from "@/components/workspace-provider";
import { loadingState, makeReview, readyState } from "../support/workspace-fixture";

const REVIEW_ID = "review-under-test";

const searchParams = new URLSearchParams({ id: REVIEW_ID });
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

vi.mock("@/lib/db/repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db/repository")>()),
  updateReview: vi.fn(),
  submitReview: vi.fn(),
}));

vi.mock("@/lib/ai/client", () => ({
  expand: vi.fn(),
  AIClientError: class extends Error {},
}));

function mount(state: WorkspaceState, children: ReactNode = <ReviewEditor />) {
  return render(
    <WorkspaceStateProvider state={state}>{children}</WorkspaceStateProvider>,
  );
}

const withReview = readyState({ data: { reviews: [makeReview()] } });

describe("ReviewEditor mount ordering", () => {
  afterEach(cleanup);

  it("renders the editor when the review is already in the snapshot at mount", () => {
    const view = mount(withReview);
    expect(
      view.container.querySelector('[data-testid="review-editor"]'),
    ).not.toBeNull();
  });

  it("renders the editor when the snapshot arrives after mount", () => {
    // The WebKit ordering that produced the flake: navigation lands on the
    // editor before the workspace has refreshed, so the first render sees no
    // review at all.
    const view = mount(loadingState());
    expect(view.container.textContent).toContain("Opening review");

    view.rerender(
      <WorkspaceStateProvider state={withReview}>
        <ReviewEditor />
      </WorkspaceStateProvider>,
    );

    expect(
      view.container.querySelector('[data-testid="review-editor"]'),
    ).not.toBeNull();
  });

  it("reports a review that is absent once the snapshot is ready", () => {
    const view = mount(readyState());
    expect(view.container.textContent).toContain("isn’t in this browser");
  });

  it("does not discard unsaved local edits when a later snapshot arrives", () => {
    const view = mount(withReview);

    const titleInput = view.container.querySelector<HTMLInputElement>(
      'input[aria-label="Review title"]',
    );
    expect(titleInput).not.toBeNull();
    fireEvent.change(titleInput!, { target: { value: "Edited but unsaved" } });

    // Any other tab's write republishes the snapshot with the stored title.
    view.rerender(
      <WorkspaceStateProvider state={readyState({ data: { reviews: [makeReview()] } })}>
        <ReviewEditor />
      </WorkspaceStateProvider>,
    );

    expect(
      view.container.querySelector<HTMLInputElement>(
        'input[aria-label="Review title"]',
      )?.value,
    ).toBe("Edited but unsaved");
  });
});
