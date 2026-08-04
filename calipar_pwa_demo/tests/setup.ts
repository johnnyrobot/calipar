import "fake-indexeddb/auto";
import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal("BroadcastChannel", undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
