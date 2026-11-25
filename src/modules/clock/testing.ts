import type { Clock, Ids } from "./types.ts";

/** A clock that stands still until a test moves it. Starts at 2026-11-23T10:00:00Z. */
export interface FakeClock extends Clock {
  readonly advance: (milliseconds: number) => void;
  readonly set: (at: number) => void;
}

export function fakeClock(start = Date.UTC(2026, 10, 23, 10)): FakeClock {
  let at = start;
  return {
    now: () => at,
    advance: (milliseconds) => void (at += milliseconds),
    set: (next) => void (at = next),
  };
}

/** Real time, moved by a test: the fake world's clock for periods that last a month. Shared in one isolate. */
export const worldClock = (() => {
  let offset = 0;
  return {
    now: () => Date.now() + offset,
    /** Pretend it is `at` from now on; `undefined` goes back to real time. */
    set: (at: number | undefined) => void (offset = at === undefined ? 0 : at - Date.now()),
  };
})();

/** Ids that count up: `ws_1`, `ws_2`, … per prefix. */
export function countingIds(): Ids {
  const counts = new Map<string, number>();
  return {
    next: (prefix) => {
      const count = (counts.get(prefix) ?? 0) + 1;
      counts.set(prefix, count);
      return `${prefix}_${count}`;
    },
  };
}
