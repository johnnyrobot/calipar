import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { WorkspaceProvider } from "@/components/workspace-provider";

/**
 * The workspace is provided here, not in the root layout, so that the two
 * routes outside this group — the landing page and the offline shell — do not
 * pay for the data layer they never read.
 *
 * It must wrap `AppShell`, which is itself a `useWorkspace` caller.
 */
export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
