import type { Objective } from "~/modules/playbook/types.ts";
import type { Reading, Worse } from "../types.ts";
import { counted } from "./counted.ts";
import { reaches } from "./line.ts";

/** What is listed as not to get worse: fine at its limit, not yet when nothing settled has been read. */
export function worse(objective: Objective, readings: Readonly<Record<string, readonly Reading[]>>, now: number): readonly Worse[] {
  return objective.notWorse.map(({ measure, limit }) => {
    const last = counted(readings[measure.counts] ?? [], measure.settles, now).at(-1);
    if (!last) return { counts: measure.counts, now: Number.NaN, limit, is: "not yet" };
    const fine = reaches(measure.better, last.value, limit);
    return { counts: measure.counts, now: last.value, limit, is: fine ? "fine" : "worse" };
  });
}
