import type { Range } from "../types.ts";

/** How many of the thirty days a range shows. */
const SHOWN: Readonly<Record<Range, number>> = { "7d": 7, "30d": 30 };

export const RANGES: readonly { readonly value: Range; readonly label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

export const isRange = (value: string): value is Range => value === "7d" || value === "30d";

/** The last days of a series that a range shows. */
export const within = <T>(range: Range, series: readonly T[]): readonly T[] => series.slice(-SHOWN[range]);

/** `2026-11-24` as `24 Nov`, in UTC like the days themselves. */
export const shortDay = (day: string): string =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export const total = (series: readonly number[]): number => series.reduce((sum, one) => sum + one, 0);
