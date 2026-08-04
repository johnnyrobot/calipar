import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import NewReviewPage from "@/app/(demo)/reviews/new/page";
import {
  WorkspaceStateProvider,
  type WorkspaceState,
} from "@/components/workspace-provider";
import { createReview } from "@/lib/db/repository";
import { loadingState, makeOrganization, readyState } from "../support/workspace-fixture";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/db/repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db/repository")>()),
  createReview: vi.fn(),
}));

const programs = [
  makeOrganization({ id: "org-biology", name: "Biology", code: "BIOL" }),
  makeOrganization({ id: "org-nursing", name: "Nursing", code: "NURS" }),
];

const withPrograms = readyState({
  data: {
    organizations: [
      makeOrganization({ id: "org-college", type: "institution", name: "College", code: "COL" }),
      ...programs,
    ],
  },
});

function mount(state: WorkspaceState) {
  return render(
    <WorkspaceStateProvider state={state}>
      <NewReviewPage />
    </WorkspaceStateProvider>,
  );
}

function programSelect(container: HTMLElement) {
  return container.querySelector<HTMLSelectElement>(
    '[data-testid="review-program"]',
  );
}

describe("NewReviewPage program selection", () => {
  afterEach(() => {
    cleanup();
    vi.mocked(createReview).mockReset();
    push.mockReset();
  });

  it("selects the first program when the snapshot is ready at mount", () => {
    const view = mount(withPrograms);
    expect(programSelect(view.container)?.value).toBe("org-biology");
  });

  it("resolves the program once a snapshot arrives after mount", async () => {
    // The latch this replaces: mounting while the workspace was still loading
    // pinned the program to "" permanently, because state was initialised from
    // an empty programs list exactly once.
    //
    // Asserting on the submitted value rather than the select's — a non-multiple
    // <select> reports its first option's value when nothing matches, so the
    // rendered value cannot tell the latched case from the derived one.
    vi.mocked(createReview).mockResolvedValue({ id: "review-new" } as never);
    const view = mount(loadingState());

    view.rerender(
      <WorkspaceStateProvider state={withPrograms}>
        <NewReviewPage />
      </WorkspaceStateProvider>,
    );

    fireEvent.submit(view.container.querySelector("form")!);
    await vi.waitFor(() => expect(createReview).toHaveBeenCalledOnce());

    expect(vi.mocked(createReview).mock.calls[0]?.[0]).toMatchObject({
      organizationId: "org-biology",
    });
  });

  it("submits the derived program without an explicit choice", async () => {
    vi.mocked(createReview).mockResolvedValue({ id: "review-new" } as never);
    const view = mount(withPrograms);

    fireEvent.submit(view.container.querySelector("form")!);
    await vi.waitFor(() => expect(createReview).toHaveBeenCalledOnce());

    expect(vi.mocked(createReview).mock.calls[0]?.[0]).toMatchObject({
      organizationId: "org-biology",
    });
  });

  it("keeps the visitor's choice when a later snapshot arrives", async () => {
    vi.mocked(createReview).mockResolvedValue({ id: "review-new" } as never);
    const view = mount(withPrograms);
    fireEvent.change(programSelect(view.container)!, {
      target: { value: "org-nursing" },
    });

    view.rerender(
      <WorkspaceStateProvider state={withPrograms}>
        <NewReviewPage />
      </WorkspaceStateProvider>,
    );

    fireEvent.submit(view.container.querySelector("form")!);
    await vi.waitFor(() => expect(createReview).toHaveBeenCalledOnce());

    expect(vi.mocked(createReview).mock.calls[0]?.[0]).toMatchObject({
      organizationId: "org-nursing",
    });
  });

  it("disables submission while no program is available", () => {
    const view = mount(loadingState());
    expect(
      view.container.querySelector<HTMLButtonElement>(
        '[data-testid="create-review"]',
      )?.disabled,
    ).toBe(true);
  });
});
