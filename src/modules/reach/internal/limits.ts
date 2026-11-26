import type { Limits, Spent } from "../types.ts";

export type LimitKey = keyof Limits;

export const limitKeys: readonly LimitKey[] = ["perWork", "perDay", "perMonth", "hours", "atOnce"];

const named: Readonly<Record<LimitKey, string>> = {
  perWork: "per piece of work (perWork)",
  perDay: "per day (perDay)",
  perMonth: "per month (perMonth)",
  hours: "of hours (hours)",
  atOnce: "of pieces of work at once (atOnce)",
};

export function limitName(key: LimitKey): string {
  return named[key];
}

/** A limit of the part above the whole's. A whole with no limit of its own does not stop one below. */
export function widerLimits(whole: Limits, part: Limits): readonly LimitKey[] {
  return limitKeys.filter((key) => {
    const mine = part[key];
    const above = whole[key];
    return mine !== undefined && above !== undefined && mine > above;
  });
}

function set(into: Record<string, number>, key: LimitKey, value: number | undefined): void {
  if (value !== undefined) into[key] = value;
}

/** The lower of each limit. Absent on one side: the other counts. */
export function lowest(a: Limits, b: Limits): Limits {
  const out: Record<string, number> = {};
  for (const key of limitKeys) {
    const x = a[key];
    const y = b[key];
    set(out, key, x === undefined ? y : y === undefined ? x : Math.min(x, y));
  }
  return out;
}

const spentOf: Readonly<Record<Exclude<LimitKey, "atOnce">, keyof Spent>> = {
  perWork: "work",
  perDay: "day",
  perMonth: "month",
  hours: "hours",
};

const reachedWords: Readonly<Record<Exclude<LimitKey, "atOnce">, (limit: number) => string>> = {
  perWork: (limit) => `The limit per piece of work, $${limit}, is reached.`,
  perDay: (limit) => `The limit per day, $${limit}, is reached.`,
  perMonth: (limit) => `The limit per month, $${limit}, is reached.`,
  hours: (limit) => `The limit of ${limit} hours is reached.`,
};

/** The limits that are reached: spent is the limit or more. */
export function reached(limits: Limits, spent: Spent): readonly string[] {
  const said: string[] = [];
  for (const key of ["perWork", "perDay", "perMonth", "hours"] as const) {
    const limit = limits[key];
    if (limit !== undefined && spent[spentOf[key]] >= limit) said.push(reachedWords[key](limit));
  }
  return said;
}
