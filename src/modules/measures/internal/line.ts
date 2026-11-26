import type { Objective } from "~/modules/playbook/types.ts";
import { startOfDay } from "./time.ts";

/** The value the measure began at, or null when nobody knows it. */
export function beforeValue(objective: Objective): number | null {
  const before = objective.measure.before;
  return "value" in before ? before.value : null;
}

/** From `before` at the start to the aim at its date, straight; level before and after. */
export function lineAt(objective: Objective, start: number, at: number): number {
  const from = beforeValue(objective);
  const to = objective.aim.value;
  if (from === null) return to;
  const end = startOfDay(objective.aim.by);
  if (Number.isNaN(end) || end <= start || at >= end) return to;
  if (at <= start) return from;
  return from + ((to - from) * (at - start)) / (end - start);
}

/** `value` is at or past `target` in the better way. */
export function reaches(better: "more" | "less", value: number, target: number): boolean {
  return better === "more" ? value >= target : value <= target;
}
