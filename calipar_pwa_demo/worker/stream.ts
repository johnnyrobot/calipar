export interface StreamLimits {
  bytes: number;
  lineCharacters: number;
  events: number;
  milliseconds: number;
}

export type StreamLimitReason = "bytes" | "line" | "events" | "time";

export class StreamLimitExceeded extends Error {
  constructor(readonly reason: StreamLimitReason) {
    super(`The AI stream exceeded its ${reason} ceiling.`);
    this.name = "StreamLimitExceeded";
  }
}

/**
 * Ceilings for one SSE relay. The relay consults this on every read, so a
 * provider that never terminates, never sends a newline, or floods events is
 * cut off instead of growing the Worker's memory without bound.
 *
 * Four independent failure modes, four ceilings: total bytes relayed, the
 * length of a single un-newlined buffer, the number of events emitted, and
 * wall-clock duration. A budget throws a plain error rather than an ApiError so
 * this module imports nothing from the router and stays directly testable.
 */
export class StreamBudget {
  #bytes = 0;
  #events = 0;
  readonly #startedAt: number;

  constructor(
    private readonly limits: StreamLimits,
    private readonly now: () => number = () => Date.now(),
  ) {
    this.#startedAt = now();
  }

  get bytes(): number {
    return this.#bytes;
  }

  addChunk(byteLength: number): void {
    this.#bytes += byteLength;
    if (this.#bytes > this.limits.bytes) throw new StreamLimitExceeded("bytes");
  }

  addBuffer(length: number): void {
    if (length > this.limits.lineCharacters) throw new StreamLimitExceeded("line");
  }

  addEvent(): void {
    this.#events += 1;
    if (this.#events > this.limits.events) throw new StreamLimitExceeded("events");
  }

  checkTime(): void {
    if (this.now() - this.#startedAt > this.limits.milliseconds) {
      throw new StreamLimitExceeded("time");
    }
  }
}
