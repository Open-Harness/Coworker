import { DAYS } from "../types.ts";

const DAY_MS = 86_400_000;

/** The UTC day a moment falls in. */
export const dayOf = (at: number): string => new Date(at).toISOString().slice(0, 10);

/** The last `DAYS` UTC days up to and including today's, oldest first. */
export const lastDays = (now: number): readonly string[] =>
  Array.from({ length: DAYS }, (_, index) => dayOf(now - (DAYS - 1 - index) * DAY_MS));

/** Counts moments per day of `days`; one outside them is not counted. */
export function perDay(days: readonly string[], moments: readonly number[]): readonly number[] {
  const counts = new Map(days.map((day) => [day, 0]));
  for (const at of moments) {
    const day = dayOf(at);
    if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return days.map((day) => counts.get(day) ?? 0);
}

/** The last millisecond of a `2026-11-24` day. */
export const endOf = (day: string): number => Date.parse(`${day}T00:00:00.000Z`) + DAY_MS - 1;
