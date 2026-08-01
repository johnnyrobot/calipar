"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  getDashboardSummary,
  getWorkspaceSnapshot,
  initializeWorkspace,
  subscribeWorkspace,
  type DashboardSummary,
} from "@/lib/db/repository";
import type { WorkspaceData } from "@/lib/domain/types";

export type WorkspaceState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: WorkspaceData; summary: DashboardSummary };

export interface WorkspaceContextValue {
  state: WorkspaceState;
  refresh(): Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The browser did not provide access to IndexedDB.";
}

const noRefresh = async () => {};

/**
 * The seam every workspace consumer crosses. Two adapters sit here:
 * `WorkspaceProvider` below, which reads IndexedDB, and any caller that
 * supplies a state directly — which is how tests reach the three states
 * without touching storage.
 */
export function WorkspaceStateProvider({
  state,
  refresh = noRefresh,
  children,
}: {
  state: WorkspaceState;
  refresh?: () => Promise<void>;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ state, refresh }), [state, refresh]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>({ status: "loading" });

  const refresh = useCallback(async () => {
    try {
      const [data, summary] = await Promise.all([
        getWorkspaceSnapshot(),
        getDashboardSummary(),
      ]);
      setState({ status: "ready", data, summary });
    } catch (error) {
      setState({ status: "error", message: errorMessage(error) });
    }
  }, []);

  useEffect(() => {
    let active = true;
    void initializeWorkspace()
      .then(() => {
        if (active) return refresh();
      })
      .catch((error: unknown) => {
        if (active) setState({ status: "error", message: errorMessage(error) });
      });

    const unsubscribe = subscribeWorkspace(() => {
      if (active) void refresh();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [refresh]);

  return (
    <WorkspaceStateProvider state={state} refresh={refresh}>
      {children}
    </WorkspaceStateProvider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used within WorkspaceProvider.");
  return value;
}
