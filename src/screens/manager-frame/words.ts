import { useMemo } from "react";
import { useRead } from "~/modules/page/service.ts";
import type { Tile } from "~/modules/views-workspace/types.ts";

/* How a manager's pages say a number, a date and how long ago: from the view's data, never from its words. */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const trim = (value: number, places: number): string => String(Number(value.toFixed(places)));

/** `5 min`, `3 h`, `2 d`: how long ago, short. */
export const ago = (now: number, at: number): string => {
  const span = Math.max(0, now - at);
  if (span < HOUR) return `${Math.max(1, Math.round(span / MIN))} min`;
  if (span < DAY) return `${Math.round(span / HOUR)} h`;
  return `${Math.round(span / DAY)} d`;
};

/** `14 Sep`, in the workspace's zone. */
export const dayMonth = (at: number, zone: string): string => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, day: "numeric", month: "short" }).formatToParts(at);
  const part = (type: string): string => parts.find((one) => one.type === type)?.value ?? "";
  return `${part("day")} ${part("month")}`;
};

/** The zone of the workspace, for dates that are not in the past. */
export function useZone(): string {
  const shell = useRead("/shell");
  return useMemo(() => (shell._tag === "Ok" ? shell.value.workspace.zone : "UTC"), [shell]);
}

/** A number of a tile, in its own unit. `long`: say days where short says d. */
export function say(unit: Tile["unit"], value: number, long = false): string {
  if (unit === "share") return `${Math.round(value * 100)}%`;
  if (unit === "dollars") return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
  if (unit === "hours") {
    if (value < 1) return `${Math.max(1, Math.round(value * 60))} min`;
    if (value < 24) return `${trim(value, 1)} h`;
    return `${trim(value / 24, 1)} ${long ? "days" : "d"}`;
  }
  return trim(value, 1);
}

export const capital = (text: string): string => `${text.slice(0, 1).toUpperCase()}${text.slice(1)}`;

const DAYS = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"] as const;

/** A five-field cron as people say it: `30 8 * * 1-5` is "Weekdays, 08:30". What it cannot say, it leaves as it is. */
export function cadence(cron: string): string {
  const [minute = "", hour = "", dom = "", month = "", dow = ""] = cron.split(/\s+/u);
  if (dom !== "*" || month !== "*") return cron;
  const days = dow === "*" ? "Every day" : dow === "1-5" ? "Weekdays" : /^[0-6]$/u.test(dow) ? (DAYS[Number(dow)] ?? cron) : cron;
  if (hour === "*" && minute === "0") return dow === "*" ? "Every hour" : `${days}, every hour`;
  if (!/^\d+$/u.test(hour) || !/^\d+$/u.test(minute)) return cron;
  return `${days}, ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

/** A day that is near as people say it: today, tomorrow, else `5 Oct`. */
export function nearDay(at: number, now: number, zone: string): string {
  if (dayMonth(at, zone) === dayMonth(now, zone)) return "today";
  return dayMonth(at, zone) === dayMonth(now + DAY, zone) ? "tomorrow" : dayMonth(at, zone);
}

/** How long something took: `11 min`, `1 h 40 min`. */
export function lasted(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 === 0 ? "" : ` ${minutes % 60} min`}`;
}
