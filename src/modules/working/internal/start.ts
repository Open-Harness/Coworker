import type { ToDo } from "~/modules/work/types.ts";
import type { Job, ThreadRow, WorkingDeps } from "../types.ts";
import { agentOf, opening } from "./brief.ts";
import { idOf } from "./ids.ts";
import { apply, kindOf } from "./events.ts";
import { defaultBranch } from "./github.ts";
import { branchFor, pendingOf, turn, type Turned } from "./thread.ts";

type Start = Extract<ToDo, { readonly do: "start" }>;

/** A thread's id, made from the job that began it, so that beginning it again finds it. */
const threadIdOf = (key: string): string => idOf("th", key);

/** How a job went: it is done, or it waits for something that is not here, and says what. */
export type Outcome = { readonly _tag: "Done" } | { readonly _tag: "Held"; readonly why: string; readonly model?: string };
export const done: Outcome = { _tag: "Done" };
export const held = (why: string, model?: string): Outcome => ({ _tag: "Held", why, ...(model === undefined ? {} : { model }) });

/** A checker is shown the work as it stands: the diff of its branch against where it began. */
async function diffOf(c: WorkingDeps, work: string, repo: string, id: string): Promise<string | Outcome> {
  const base = await defaultBranch(c.outside, repo);
  const branch = branchFor(work);
  const ran = await c.boxes.run(work, `${id}.diff`, `git diff "$(git merge-base origin/${base} ${branch})" ${branch}`, 60);
  return "_tag" in ran ? held(ran.why) : ran.stdout;
}

/** What comes of a turn that has gone as far as it can. */
function after(c: WorkingDeps, id: string, turned: Turned): Outcome {
  if (turned._tag === "Waits") return held(turned.why, turned.model);
  const row = c.store.thread(id);
  const work = row === undefined ? undefined : c.store.work(row.work);
  // At a call it waits for an answer, or the work waits for one (its limit): it is not quiet, it is waiting, and it goes on when answered.
  if (turned._tag === "Parked" || (work !== undefined && work.waits !== null)) return done;
  if (turned._tag === "Ended" || row === undefined || work === undefined || row.state === "ended" || work.ended !== null) return done;
  const kind = kindOf(c, work);
  const step = kind?.steps.find((one) => one.id === work.step);
  // The manager's own hands wait for the world between turns.
  if (step !== undefined && "manager" in step.by) return done;
  const key = `stopped:${id}:${c.store.messages(id).length}`;
  c.store.putThread({ ...row, state: "ended" });
  // A step that code checks is left when its commands pass, whatever the agent said: what it did is looked at, and sent back if it is not so.
  if (step?.leaves.some((leave) => leave.by === "command") === true) {
    const said = c.store.messages(id).findLast((message) => message.role === "assistant" && message.content !== null);
    const says = said?.role === "assistant" && said.content !== null ? said.content : "It stopped without saying more.";
    apply(c, work.id, { key, at: c.clock.now(), is: "reported", thread: id, result: "done", says, evidence: [] });
    const now = c.store.work(work.id);
    if (now !== undefined && now.ended === null) c.store.addJobs(now.id, [{ key: `${key}:checks`, do: "run checks", step: now.step }]);
    return done;
  }
  apply(c, work.id, { key, at: c.clock.now(), is: "unanswered", thread: id, why: "It stopped without saying that it was done." });
  return done;
}

/** A thread of an agent on a step: begun once, and gone on with until it has no more to do. */
export async function startThread(c: WorkingDeps, workId: string, job: Start): Promise<Outcome> {
  const id = threadIdOf(job.key);
  let row = c.store.thread(id);
  if (row === undefined) {
    const work = c.store.work(workId);
    const playbook = work === undefined ? undefined : c.playbook(work.version);
    const agent = playbook === undefined ? undefined : agentOf(playbook, job.agent);
    if (work === undefined || playbook === undefined || agent === undefined) return done;
    let todo = job.brief;
    if (job.role === "checks") {
      const diff = await diffOf(c, workId, work.from.place, id);
      if (typeof diff !== "string") return diff;
      todo = `${job.brief}\n\nThe change, as a diff of its branch:\n${diff}`;
    }
    const made: ThreadRow = {
      id,
      work: workId,
      agent: job.agent,
      role: job.role,
      step: job.step,
      state: "working",
      started: c.clock.now(),
      brief: job.brief,
      said: "",
      model: null,
    };
    const messages = await opening(c.store, c.outside, playbook, work, made, agent, todo);
    c.store.transaction(() => {
      c.store.putThread(made);
      for (const message of messages) c.store.addMessage(id, message);
    });
    row = made;
    apply(c, workId, { key: `started:${id}`, at: c.clock.now(), is: "started", thread: id, agent: job.agent });
  }
  return after(c, id, await turn(c, id));
}

/** A thread that waited for an answer goes on from where it was. */
export async function resumeThread(c: WorkingDeps, job: Extract<Job, { readonly do: "resume" }>): Promise<Outcome> {
  return after(c, job.thread, await turn(c, job.thread));
}

/** What someone says to a thread that is working is said to it, once, and it goes on. To one that ended, a new one of the same agent. */
export async function tellThread(c: WorkingDeps, workId: string, job: Extract<ToDo, { readonly do: "tell thread" }>): Promise<Outcome> {
  const row = c.store.thread(job.thread);
  const work = c.store.work(workId);
  if (row === undefined || work === undefined) return done;
  if (row.state === "ended")
    return startThread(c, workId, {
      key: job.key,
      do: "start",
      step: work.step,
      agent: row.agent,
      role: row.role,
      fresh: false,
      brief: job.what,
    });
  // A thread at a call that waits for its answer is not told anything in between: it would stand between the call and its result.
  if (pendingOf(c.store.messages(row.id)).length > 0) return done;
  c.store.transaction(() => {
    if (c.store.once(`told:${job.key}`) !== undefined) return;
    c.store.addMessage(row.id, { role: "user", content: job.what });
    c.store.keepOnce(`told:${job.key}`, "yes");
  });
  return after(c, row.id, await turn(c, row.id));
}
