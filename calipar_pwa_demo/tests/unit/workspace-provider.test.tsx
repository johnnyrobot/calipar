import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WorkspaceStateProvider,
  useWorkspace,
} from "@/components/workspace-provider";
import { errorState, loadingState, makeReview, readyState } from "../support/workspace-fixture";

function Probe() {
  const { state } = useWorkspace();
  return (
    <span data-testid="probe">
      {state.status === "ready"
        ? `ready:${state.data.reviews.length}:${state.derived.totalReviews}`
        : state.status === "error"
          ? `error:${state.message}`
          : "loading"}
    </span>
  );
}

function RefreshProbe() {
  const { refresh } = useWorkspace();
  return (
    <button type="button" onClick={() => void refresh()}>
      refresh
    </button>
  );
}

describe("WorkspaceStateProvider", () => {
  afterEach(cleanup);

  it("passes a loading state through the seam", () => {
    const view = render(
      <WorkspaceStateProvider state={loadingState()}>
        <Probe />
      </WorkspaceStateProvider>,
    );
    expect(view.getByTestId("probe").textContent).toBe("loading");
  });

  it("passes an error state and its message through the seam", () => {
    const view = render(
      <WorkspaceStateProvider state={errorState("Storage is blocked.")}>
        <Probe />
      </WorkspaceStateProvider>,
    );
    expect(view.getByTestId("probe").textContent).toBe("error:Storage is blocked.");
  });

  it("passes a ready state's data and derivations through the seam", () => {
    const view = render(
      <WorkspaceStateProvider
        state={readyState({
          data: { reviews: [makeReview()] },
          derived: { totalReviews: 1 },
        })}
      >
        <Probe />
      </WorkspaceStateProvider>,
    );
    expect(view.getByTestId("probe").textContent).toBe("ready:1:1");
  });

  it("supplies a no-op refresh when the caller omits one", async () => {
    const view = render(
      <WorkspaceStateProvider state={loadingState()}>
        <RefreshProbe />
      </WorkspaceStateProvider>,
    );
    // The default must be callable — a consumer that refreshes on mount should
    // not need to know which adapter it is talking to.
    expect(() => view.getByRole("button").click()).not.toThrow();
  });

  it("hands the caller's refresh to consumers", () => {
    const refresh = vi.fn(async () => {});
    const view = render(
      <WorkspaceStateProvider state={loadingState()} refresh={refresh}>
        <RefreshProbe />
      </WorkspaceStateProvider>,
    );
    view.getByRole("button").click();
    expect(refresh).toHaveBeenCalledOnce();
  });
});

describe("useWorkspace", () => {
  afterEach(cleanup);

  it("refuses to run outside a provider", () => {
    // React logs the thrown render error; silence it so the suite output stays
    // readable while still asserting the throw.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(
      /useWorkspace must be used within WorkspaceProvider/,
    );
    consoleError.mockRestore();
  });
});
