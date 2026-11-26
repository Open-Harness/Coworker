import type { Clock } from "../types.ts";

const DAY = 86_400_000;

/** The date of an instant in a zone, as year, month, day: for comparing days without arithmetic on the clock. */
const dayIn = (at: number, zone: string): number => {
  const [year = 0, month = 0, day = 0] = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  })
    .format(at)
    .split("-")
    .map(Number);
  return Date.UTC(year, month - 1, day);
};

export function createClock(now: () => number, zone: string): Clock {
  const clock = (at: number) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);
  return {
    now,
    time: clock,
    short(at) {
      const ago = Math.round((dayIn(now(), zone) - dayIn(at, zone)) / DAY);
      if (ago <= 0) return clock(at);
      if (ago === 1) return "Yesterday";
      if (ago < 7) return new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "short" }).format(at);
      return new Intl.DateTimeFormat("en-GB", { timeZone: zone, day: "numeric", month: "short" }).format(at);
    },
  };
}
