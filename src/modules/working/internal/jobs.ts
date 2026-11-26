import type { Job, WorkingDeps } from "../types.ts";
import { confirm, runChecks } from "./checks.ts";
import { rearm } from "./events.ts";
import { commentOnce } from "./github.ts";
import { askAboutModel, askJob, modelIsBack } from "./asked.ts";
import { done, held, type Outcome, resumeThread, startThread, tellThread } from "./start.ts";

/* What moving work asked to be done, done in the order it was asked, each once: what was done before a crash is not done again. */

const RETRY = 60_000;
/** Said even when the work is over: it is how whoever asked hears so, and how its threads and box are let go. */
const AFTER_END: ReadonlySet<Job["do"]> = new Set(["say", "end threads", "end box"]);

/** What is said where it was asked. A merged pull request is told as `Merged #n`, which is the whole of it: the issue is closed by it. */
function wordsOf(c: WorkingDeps, workId: string, text: string): string {
  const ended = c.store.work(workId)?.ended;
  return ended?.as === "done" && ended.why.startsWith("Merged #") ? ended.why : text;
}

async function say(c: WorkingDeps, workId: string, job: Extract<Job, { readonly do: "say" }>): Promise<Outcome> {
  if (job.where.connector !== "github") return done;
  const said = await commentOnce(c.outside, job.where.place, Number(job.where.id), wordsOf(c, workId, job.text), job.key);
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
      return say(c, workId, job);
    case "confirm":
      return confirm(c, workId, job);
    case "run checks":
      return runChecks(c, workId, job);
    case "end threads": {
      for (const row of c.store.threadsOf(workId)) if (row.state === "working") c.store.putThread({ ...row, state: "ended" });
      // What was asked of a person for this work is not asked any more.
      const ended = c.store.work(workId)?.ended;
      await c.outside.asks({ op: "gone", work: workId, why: ended?.why ?? "The work ended." });
      return done;
    }
    case "end box":
      await c.boxes.end(workId);
      return done;
    case "ask":
      return askJob(c, workId, job);
    case "resume":
      return resumeThread(c, job);
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
    if (outcome._tag === "Held" && outcome.model !== undefined)
      outcome = await askAboutModel(c, workId, next.job, outcome.model, outcome.why).catch(() => outcome);
    if (outcome._tag === "Held") {
      c.store.setHold(workId, { why: outcome.why, retry: outcome.retry ?? c.clock.now() + RETRY });
      rearm(c);
      return;
    }
    await modelIsBack(c, workId, next.job).catch(() => undefined);
    c.store.transaction(() => {
      c.store.finishJob(next.job.key);
      c.store.setHold(workId, null);
    });
  }
}
