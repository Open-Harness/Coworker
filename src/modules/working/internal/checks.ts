import type { WorkingDeps } from "../types.ts";
import { apply, kindOf } from "./events.ts";
import { done, held, type Outcome } from "./start.ts";

const OUT = 1_500;

/** The commands a step's own leaves name, run in the work's box: what they print is the evidence, by code and by nobody else. */
export async function runChecks(c: WorkingDeps, workId: string, job: { readonly key: string; readonly step: string }): Promise<Outcome> {
  const work = c.store.work(workId);
  if (work === undefined || work.ended !== null || work.step !== job.step) return done;
  const step = kindOf(c, work)?.steps.find((one) => one.id === job.step);
  for (const leave of step?.leaves ?? []) {
    if (leave.by !== "command" || leave.run === undefined) continue;
    const ran = await c.boxes.run(workId, `${job.key}.${leave.id}`, leave.run, 600);
    if ("_tag" in ran) return held(ran.why);
    const at = c.clock.now();
    const key = `ci:${job.key}:${leave.id}`;
    if (ran.exitCode === 0) apply(c, workId, { key, at, is: "passed", by: "ci", check: leave.id });
    else {
      const printed = `${ran.stdout}\n${ran.stderr}`.trim().slice(-OUT);
      apply(c, workId, {
        key,
        at,
        is: "failed",
        by: "ci",
        check: leave.id,
        says: `${leave.id} failed: ${leave.run} exited ${ran.exitCode}${printed === "" ? "" : `\n${printed}`}`,
      });
    }
  }
  return done;
}

/** A connector says that it did what was asked of it: the leave it was waiting for is shown, by code. */
export function confirm(c: WorkingDeps, workId: string, job: { readonly key: string; readonly check: string }): Outcome {
  apply(c, workId, { key: `confirm:${job.key}`, at: c.clock.now(), is: "passed", by: "connector", check: job.check });
  return done;
}
