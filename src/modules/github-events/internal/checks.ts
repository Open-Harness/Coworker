import type { CheckRecord, CheckState } from "../types.ts";

/* What the checks of one commit say. The newest id of each name counts; a run that was cancelled says nothing. */

export const NO_CHECKS: CheckState = { is: "none", failed: [] };

export function newestOfEach(checks: readonly CheckRecord[]): readonly CheckRecord[] {
  const byName = new Map<string, CheckRecord>();
  for (const check of checks) {
    const name = `${check.app}\u0000${check.name}`;
    const was = byName.get(name);
    if (was === undefined || check.id > was.id) byName.set(name, check);
  }
  return [...byName.values()].toSorted((a, b) => a.id - b.id);
}

/** The checks that decide: not over, or over with a verdict. */
export const counted = (checks: readonly CheckRecord[]): readonly CheckRecord[] =>
  newestOfEach(checks).filter((one) => one.state !== "done" || one.ended === "passed" || one.ended === "failed");

export function checkState(checks: readonly CheckRecord[]): CheckState {
  const all = counted(checks);
  const failed = all.filter((one) => one.state === "done" && one.ended === "failed");
  if (failed.length > 0)
    return {
      is: "failed",
      failed: failed
        .map(({ name, says, link, id }) => ({ name, says, link, id }))
        .toSorted((a, b) => (a.name === b.name ? a.id - b.id : a.name < b.name ? -1 : 1)),
    };
  if (all.some((one) => one.state !== "done")) return { is: "running", failed: [] };
  return all.length === 0 ? NO_CHECKS : { is: "passed", failed: [] };
}
