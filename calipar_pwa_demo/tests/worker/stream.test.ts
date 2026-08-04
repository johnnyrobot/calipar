import { describe, expect, it } from "vitest";

import { StreamBudget, StreamLimitExceeded } from "../../worker/stream";

const limits = { bytes: 1_000, lineCharacters: 100, events: 5, milliseconds: 1_000 };

describe("StreamBudget", () => {
  it("allows traffic inside every ceiling", () => {
    const budget = new StreamBudget(limits, () => 0);
    budget.addChunk(400);
    budget.addChunk(400);
    budget.addBuffer(50);
    budget.addEvent();
    budget.checkTime();
    expect(budget.bytes).toBe(800);
  });

  it("throws on aggregate bytes with reason 'bytes'", () => {
    const budget = new StreamBudget(limits, () => 0);
    budget.addChunk(600);
    expect(() => budget.addChunk(600)).toThrow(StreamLimitExceeded);
    try {
      new StreamBudget(limits, () => 0).addChunk(1_001);
      expect.unreachable("expected the byte ceiling to throw");
    } catch (error) {
      expect((error as StreamLimitExceeded).reason).toBe("bytes");
    }
  });

  it("throws when one un-newlined buffer grows past the line ceiling", () => {
    const budget = new StreamBudget(limits, () => 0);
    expect(() => budget.addBuffer(101)).toThrow(StreamLimitExceeded);
  });

  it("throws when the event count is exceeded", () => {
    const budget = new StreamBudget(limits, () => 0);
    for (let index = 0; index < 5; index += 1) budget.addEvent();
    expect(() => budget.addEvent()).toThrow(StreamLimitExceeded);
  });

  it("throws when wall-clock time is exceeded", () => {
    let clock = 0;
    const budget = new StreamBudget(limits, () => clock);
    clock = 1_001;
    expect(() => budget.checkTime()).toThrow(StreamLimitExceeded);
  });

  it("defaults to a real clock when none is injected", () => {
    const budget = new StreamBudget(limits);
    expect(() => budget.checkTime()).not.toThrow();
  });

  it("reports a distinct reason per ceiling", () => {
    const reasons: string[] = [];
    for (const run of [
      () => new StreamBudget(limits, () => 0).addChunk(2_000),
      () => new StreamBudget(limits, () => 0).addBuffer(2_000),
      () => {
        const budget = new StreamBudget({ ...limits, events: 0 }, () => 0);
        budget.addEvent();
      },
      () => {
        let clock = 0;
        const budget = new StreamBudget(limits, () => clock);
        clock = 5_000;
        budget.checkTime();
      },
    ]) {
      try {
        run();
      } catch (error) {
        reasons.push((error as StreamLimitExceeded).reason);
      }
    }
    expect(reasons).toEqual(["bytes", "line", "events", "time"]);
  });
});
