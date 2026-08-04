import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/app-shell";
import {
  WorkspaceStateProvider,
  type WorkspaceState,
} from "@/components/workspace-provider";
import { errorState, loadingState, readyState } from "../support/workspace-fixture";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/",
}));

function mount(state: WorkspaceState) {
  return render(
    <WorkspaceStateProvider state={state}>
      <AppShell>
        <p data-testid="page-content">Dashboard content</p>
      </AppShell>
    </WorkspaceStateProvider>,
  );
}

describe("AppShell workspace gate", () => {
  afterEach(cleanup);

  it("shows the boot screen and withholds page content while loading", () => {
    const view = mount(loadingState());
    expect(view.container.textContent).toContain("PREPARING YOUR LOCAL WORKSPACE");
    expect(view.queryByTestId("page-content")).toBeNull();
    expect(view.queryByTestId("app-shell")).toBeNull();
  });

  it("shows the storage error and its message instead of page content", () => {
    const view = mount(errorState("IndexedDB is unavailable in this browser."));
    expect(view.container.textContent).toContain("LOCAL STORAGE REQUIRED");
    expect(view.container.textContent).toContain(
      "IndexedDB is unavailable in this browser.",
    );
    expect(view.queryByTestId("page-content")).toBeNull();
  });

  it("distinguishes the error screen from the boot screen", () => {
    const booting = mount(loadingState());
    expect(booting.container.textContent).not.toContain("LOCAL STORAGE REQUIRED");
    cleanup();

    const failed = mount(errorState());
    expect(failed.container.textContent).not.toContain(
      "PREPARING YOUR LOCAL WORKSPACE",
    );
  });

  it("renders the shell, navigation and page content when ready", () => {
    const view = mount(readyState());
    expect(view.queryByTestId("app-shell")).not.toBeNull();
    expect(view.getByTestId("page-content").textContent).toBe("Dashboard content");
    expect(view.getByTestId("demo-workspace-banner").textContent).toContain(
      "stored in this browser",
    );
    const linkText = (selector: string) =>
      [...view.container.querySelectorAll(`${selector} a`)].map(
        (link) => link.textContent,
      );

    expect(linkText('nav[aria-label="Primary"]')).toEqual([
      "Dashboard",
      "Program reviews",
      "Data & outcomes",
      "Integrated planning",
      "Resource requests",
      "Activity",
    ]);
    expect(linkText('nav[aria-label="Support"]')).toEqual([
      "Mission-BotAI",
      "Settings & data",
    ]);
  });

  it("marks the current route as the active page", () => {
    const view = mount(readyState());
    const current = view.container.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent).toContain("Dashboard");
  });
});
