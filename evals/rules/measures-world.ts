import { expect } from "vitest";
import type { Reading, Standing } from "~/modules/measures/types.ts";
import type { Measure, Objective } from "~/modules/playbook/types.ts";

export const DAY = 24 * 60 * 60 * 1000;
export const start = Date.UTC(2026, 10, 1);
/** Day `n` from the start: 1 November 2026, so that 31 December is day 60. */
export const day = (n: number) => start + n * DAY;

export const measure = (counts: string, better: "more" | "less", more: Partial<Measure> = {}): Measure => ({
  counts,
  unit: "a week",
  better,
  read: { from: "connector", account: "crm", query: "deals where stage = 'call held' and fit = true" },
  settles: "14d",
  before: { value: 6, at: "2026-11-01" },
  ...more,
});
export const objective = (more: Partial<Objective> = {}): Objective => ({
  said: "More good calls",
  measure: measure("Calls that took place", "more"),
  aim: { value: 12, by: "2026-12-31" },
  notWorse: [],
  owner: "bo",
  ...more,
});
export const reading = (of: number, value: number, more: Partial<Reading> = {}): Reading => ({ at: of, of, value, from: "crm", ...more });
/** A plain sentence: something is said, and it is not a state word. */
export const plain = (text: string) => {
  expect(text.trim().length).toBeGreaterThan(3);
  expect(text).not.toMatch(/\b(blocked|pending)\b/iu);
};
export const read = (standing: Standing) => {
  expect(standing._tag).toBe("Read");
  if (standing._tag !== "Read") throw new Error("not read");
  return standing;
};
