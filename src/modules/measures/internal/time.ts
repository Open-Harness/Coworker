export const DAY = 24 * 60 * 60 * 1000;

const UNITS: Readonly<Record<string, number>> = { s: 1000, m: 60_000, h: 3_600_000, d: DAY, w: 7 * DAY };

/** `14d`, `4h`, `45m` as milliseconds. Something that is not a duration is no wait at all. */
export function durationMs(text: string): number {
  const found = /^\s*(\d+(?:\.\d+)?)\s*([smhdw])\s*$/u.exec(text);
  if (!found) return 0;
  return Number(found[1]) * (UNITS[found[2] ?? ""] ?? 0);
}

/** The start of the day a date names, in UTC. `2026-12-31` is the first moment of 31 December. */
export function startOfDay(date: string): number {
  const found = /^(\d{4})-(\d{2})-(\d{2})/u.exec(date.trim());
  if (found) return Date.UTC(Number(found[1]), Number(found[2]) - 1, Number(found[3]));
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? Number.NaN : Math.floor(parsed / DAY) * DAY;
}
