import type { Clock } from "~/modules/page/types.ts";

/** A day and month, in the workspace's zone: `24 Nov`. */
export const dayOf = (at: number, zone: string): string => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, day: "numeric", month: "short" }).formatToParts(at);
  const part = (type: string): string => parts.find((one) => one.type === type)?.value ?? "";
  return `${part("day")} ${part("month")}`;
};

/** The time when it was today, else the day and the time: `24 Nov, 15:02`. */
export const whenOf = (at: number, clock: Clock, zone: string): string =>
  dayOf(at, zone) === dayOf(clock.now(), zone) ? clock.time(at) : `${dayOf(at, zone)}, ${clock.time(at)}`;

export const isToday = (at: number, clock: Clock, zone: string): boolean => dayOf(at, zone) === dayOf(clock.now(), zone);
