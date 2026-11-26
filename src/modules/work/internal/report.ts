import type { Kind, Step } from "~/modules/playbook/types.ts";
import type { Evidence, Moved, Work, WorkEvent } from "../types.ts";
import { ask } from "./ask.ts";
import { endWork } from "./ends.ts";
import { leave, settle } from "./enter.ts";
import { addEvidence, lastOthers } from "./evidence.ts";
import { fail } from "./fail.ts";
import { madeMoved, moved, refuse, same } from "./made.ts";
import { indexOfStep, stepOf } from "./steps.ts";
import { briefOf, checkBrief, wrongOf } from "./text.ts";
import { lookMs } from "./time.ts";
import { startTodo } from "./todo.ts";

type Ev<K extends WorkEvent["is"]> = Extract<WorkEvent, { is: K }>;

const notHere = (thread: string): string => `${thread} is not a conversation of this work.`;

function endOne(work: Work, id: string): Work {
  return { ...work, threads: work.threads.map((t) => (t.id === id ? { ...t, state: "ended" as const } : t)) };
}

/** A thread is working: a thread that did the work, or looks at it, by what the step says of that agent. */
export function started(work: Work, e: Ev<"started">, kind: Kind): Moved {
  if (work.threads.some((t) => t.id === e.thread)) return same(work);
  const step = stepOf(kind, work);
  const looks = step !== undefined && (("agent" in step.checkedBy && step.checkedBy.agent === e.agent) || isCheckingBy(step, e.agent));
  const role = looks ? ("checks" as const) : ("does" as const);
  return moved({ ...work, threads: [...work.threads, { id: e.thread, agent: e.agent, role, state: "working" }] });
}

function isCheckingBy(step: Step, agent: string): boolean {
  return "agent" in step.by && step.by.agent === agent && step.leaves.length > 0 && step.leaves.every((leave) => leave.by === "agent");
}

/** It is waiting for code to show what it needs, when that is what is left. */
function waitsForCi(work: Work, step: Step | undefined): boolean {
  return step !== undefined && step.leaves.some((leave) => leave.by === "command" && lastOthers(work, leave.id)?.met !== true);
}

export function reported(work: Work, e: Ev<"reported">, kind: Kind): Moved {
  const thread = work.threads.find((t) => t.id === e.thread);
  if (thread === undefined) return refuse(notHere(e.thread));
  if (thread.state === "ended") return same(work);
  const kept = addEvidence(work, e.evidence);
  if (e.result === "no") return madeMoved(endWork(kept, "no", e.says, e));
  if (e.result === "stuck")
    return madeMoved(ask(endOne(kept, thread.id), kind, e, work.answers, "decide", `${work.title} is stuck: ${e.says}`));
  if (thread.role === "checks") return refuse(`${thread.id} looks at the work, so it says what it saw with a check, not a report.`);
  const step = stepOf(kind, work);
  if (step !== undefined && work.doneWhen === null && indexOfStep(kind, step.id) === 0)
    return refuse("Done when is not said yet: say what done means before this step can be reported done.");
  const done = endOne(kept, thread.id);
  const checker = step !== undefined && "agent" in step.checkedBy ? step.checkedBy.agent : undefined;
  const left = step !== undefined && step.leaves.length === 0 && checker === undefined ? leave(done, kind, e) : settle(done, kind, e);
  if (left) return madeMoved(left);
  if (step !== undefined && checker !== undefined) {
    const brief = checkBrief(done, step, `The one who did it says: ${e.says}`);
    return moved(done, [startTodo(e, step, checker, "checks", true, brief)]);
  }
  if (waitsForCi(done, step))
    return moved({ ...done, next: { what: `the checks of ${step?.name ?? "this step"} to run`, who: "ci", by: e.at + lookMs(kind.look) } });
  return moved(done);
}

/** It did not answer. The first time at a step the same agent is started again; the second time a person is asked. */
export function unanswered(work: Work, e: Ev<"unanswered">, kind: Kind): Moved {
  const thread = work.threads.find((t) => t.id === e.thread);
  if (thread === undefined) return refuse(notHere(e.thread));
  if (thread.state === "ended") return same(work);
  const step = stepOf(kind, work);
  const mark = `unanswered@${work.step}`;
  const tries = work.evidence.filter((item) => item.check === mark).length;
  const lost: Evidence = { check: mark, met: false, says: e.why, by: { code: true }, at: e.at };
  const done = endOne(work, thread.id);
  if (tries > 0)
    return madeMoved(ask(done, kind, e, work.answers, "decide", `${work.title}: ${thread.agent} did not answer again. ${e.why}`));
  const noted = addEvidence(done, [lost]);
  const note = `The last try got no answer: ${e.why}`;
  const brief =
    step === undefined ? `${work.title}\n\n${note}` : thread.role === "checks" ? checkBrief(noted, step, note) : briefOf(noted, step, note);
  const next = { what: `${thread.agent} to try again`, who: "itself" as const, by: e.at + lookMs(kind.look) };
  return moved({ ...noted, next }, [startTodo(e, work.step, thread.agent, thread.role, thread.role === "checks", brief)]);
}

/** A fresh checker says what is true. Not met sends the step back as its word says; met all of it lets it go on. */
export function checked(work: Work, e: Ev<"checked">, kind: Kind): Moved {
  const thread = work.threads.find((t) => t.id === e.thread);
  if (thread === undefined) return refuse(notHere(e.thread));
  if (thread.role !== "checks") return refuse(`${thread.id} did this work, so it cannot check it.`);
  if (thread.state === "ended") return same(work);
  const kept = addEvidence(endOne(work, thread.id), e.evidence);
  const step = stepOf(kind, work);
  if (step !== undefined && e.evidence.some((item) => !item.met)) return madeMoved(fail(kept, kind, step, wrongOf(e.says, e.evidence), e));
  const left = step !== undefined && step.leaves.length === 0 ? leave(kept, kind, e) : settle(kept, kind, e);
  return left ? madeMoved(left) : moved(kept);
}
