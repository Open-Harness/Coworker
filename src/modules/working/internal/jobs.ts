import type { Job, WorkingDeps } from "../types.ts";
import { confirm, runChecks } from "./checks.ts";
import { rearm } from "./events.ts";
import { commentOnce } from "./github.ts";
import { done, held, type Outcome, startThread, tellThread } from "./start.ts";

/* What moving work asked to be done, done in the order it was asked, each once: what was done before a crash is not done again. */

const RETRY = 60_000;
/** Said even when the work is over: it is how whoever asked hears so, and how its threads and box are let go. */
const AFTER_END: ReadonlySet<Job["do"]> = new Set(["say", "end threads", "end box"]);

async function say(c: WorkingDeps, job: Extract<Job, { readonly do: "say" }>): Promise<Outcome> {
  if (job.where.connector !== "github") return done;
  const said = await commentOnce(c.outside, job.where.place, Number(job.where.id), job.text, job.key);
  return said._tag === "Said" ? done : held(said.why);
}

async function doJob(c: WorkingDeps, workId: string, job: Job): Promise<Outcome> {
  const ended = c.store.work(workId)?.ended !== null;
  if (ended && !AFTER_END.has(job.do)) return done;
  switch (job.do) {
    case "start":
      return startThread(c, workId, job);
    case "tell thread":
      return tellThread(c, workId, job);
    case "say":
      return say(c, job);
    case "confirm":
      return confirm(c, workId, job);
    case "run checks":
      return runChecks(c, workId, job);
    case "end threads":
      for (const row of c.store.threadsOf(workId)) if (row.state === "working") c.store.putThread({ ...row, state: "ended" });
      return done;
    case "end box":
      await c.boxes.end(workId);
      return done;
    case "ask":
      // A person is asked by the inbox; this slice does not reach it. The question is kept, so it is not lost.
      c.store.keepOnce(job.key, job.question);
      return done;
    case "wake":
      return done;
  }
}

/** Every open job of one work, oldest first. A job that cannot go on stays, and the work says why it waits. */
export async function drain(c: WorkingDeps, workId: string): Promise<void> {
  for (;;) {
    const next = c.store.nextJob(workId);
    if (next === undefined) return;
    let outcome: Outcome;
    try {
      outcome = await doJob(c, workId, next.job);
    } catch (error) {
      outcome = held(`Something went wrong: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (outcome._tag === "Held") {
      c.store.setHold(workId, { why: outcome.why, retry: c.clock.now() + RETRY });
      rearm(c);
      return;
    }
    c.store.transaction(() => {
      c.store.finishJob(next.job.key);
      c.store.setHold(workId, null);
    });
  }
}
