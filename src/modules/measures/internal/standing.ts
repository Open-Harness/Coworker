import type { Objective } from "~/modules/playbook/types.ts";
import type { Point, Reading, Standing } from "../types.ts";
import { counted, nextSettles } from "./counted.ts";
import { durationMs } from "./time.ts";
import { beforeValue, lineAt, reaches } from "./line.ts";

type Is = "on its line" | "below its line" | "reached";

/** `at`: the moment whose line it is held to. */
function judge(objective: Objective, start: number, reading: Reading, at: number = reading.of): Is {
  const { better } = objective.measure;
  if (reaches(better, reading.value, objective.aim.value)) return "reached";
  return reaches(better, reading.value, lineAt(objective, start, at)) ? "on its line" : "below its line";
}

/** Where the unbroken run that stands as the last reading does begins, and the value just before it. */
function run(objective: Objective, start: number, seen: readonly Reading[], is: Is): { since: number; before: number | null } {
  let first = seen.length - 1;
  while (first > 0 && judge(objective, start, seen[first - 1] as Reading) === is) first -= 1;
  return { since: (seen[first] as Reading).of, before: first > 0 ? (seen[first - 1] as Reading).value : null };
}

export function standing(objective: Objective, start: number, readings: readonly Reading[], now: number): Standing {
  const { settles } = objective.measure;
  if (beforeValue(objective) === null) {
    const said = "unknown" in objective.measure.before ? objective.measure.before.unknown : "";
    return { _tag: "NotYet", until: now, why: `There is no line yet, because nobody knows where it began: ${said}` };
  }
  const seen = counted(readings, settles, now);
  const last = seen.at(-1);
  if (!last) {
    const until = nextSettles(readings, settles, now);
    return {
      _tag: "NotYet",
      until: until ?? now + durationMs(settles),
      why: until === null ? "Nothing has been read yet." : "What was read has not settled yet.",
    };
  }
  const is = judge(objective, start, last, now);
  const points: Point[] = seen.map((r) => ({ at: r.of, value: r.value, line: lineAt(objective, start, r.of) }));
  return {
    _tag: "Read",
    now: last.value,
    aim: objective.aim.value,
    line: lineAt(objective, start, now),
    is,
    ...run(objective, start, seen, is),
    points,
  };
}
