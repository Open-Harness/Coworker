import type { Kind, Step } from "~/modules/playbook/types.ts";
import type { ToDo, Work } from "../types.ts";
import { endWork } from "./ends.ts";
import { isDone, leavesMet } from "./evidence.ts";
import { type Made, type Stamp, keyOf } from "./made.ts";
import { doerAgentBefore, indexOfStep, isChecking, stepOf } from "./steps.ts";
import { briefOf, checkBrief, doneWhy, whatOf } from "./text.ts";
import { lookMs } from "./time.ts";
import { startTodo, tellTodo } from "./todo.ts";

/** Put an agent on a step: the one working on it is told, else one is started. Checkers are always fresh. */
export function agentTodos(work: Work, kind: Kind, step: Step, e: Stamp, note: string): readonly ToDo[] {
  const by = step.by;
  if ("agent" in by) {
    if (isChecking(step)) return [startTodo(e, step, by.agent, "checks", true, checkBrief(work, step, note))];
    const brief = briefOf(work, step, note);
    const live = work.threads.find((t) => t.state === "working" && t.role === "does" && t.agent === by.agent);
    return live ? [tellTodo(e, live.id, brief)] : [startTodo(e, step, by.agent, "does", false, brief)];
  }
  if ("manager" in by) return managerTodos(work, kind, step, e, note);
  return [];
}

/** The manager's own hands are the agent that did the work before: it is told what this step needs, or started again. */
function managerTodos(work: Work, kind: Kind, step: Step, e: Stamp, note: string): readonly ToDo[] {
  const agent = doerAgentBefore(kind, step);
  if (agent === undefined) return [];
  const brief = briefOf(work, step, note);
  const mine = work.threads.filter((t) => t.role === "does" && t.agent === agent);
  const last = mine[mine.length - 1];
  return last?.state === "working" ? [tellTodo(e, last.id, brief)] : [startTodo(e, step, agent, "does", false, brief)];
}

/**
 * The work is at this step now. An agent step starts its agent, a person's asks them, the manager's waits for the world.
 * `notify`: a step of the manager's tells its own doer; a person who moves it there does not.
 */
export function enter(work: Work, kind: Kind, step: Step, e: Stamp, note: string, notify: boolean): Made {
  const here: Work = { ...work, step: step.id, waits: null, chased: false };
  const by = step.by;
  const till = e.at + lookMs(kind.look);
  if ("person" in by) {
    const key = keyOf(e, "ask");
    const question = [`${work.title}: ${step.name}.`, step.does, note].filter((x) => x.trim() !== "").join(" ");
    return {
      work: {
        ...here,
        waits: { ask: key, person: by.person },
        next: { what: `an answer from ${by.person}`, who: { person: by.person }, by: till },
      },
      todo: [{ key, do: "ask", person: by.person, need: "do", question, by: till }],
    };
  }
  const who = "manager" in by ? "outside" : "itself";
  const todo = "agent" in by || notify ? agentTodos(here, kind, step, e, note) : [];
  return { work: { ...here, next: { what: whatOf(step), who, by: till } }, todo };
}

/** It looks again later, on its own. */
export function stay(work: Work, kind: Kind, e: Stamp): Made {
  const step = stepOf(kind, work);
  const what = step ? whatOf(step) : "a place to start";
  return { work: { ...work, next: { what, who: "itself", by: e.at + lookMs(kind.look) } }, todo: [] };
}

/** The step is done: on to the next, or from the last one it ends done if it is. Else nothing changes. */
export function advanceFrom(work: Work, kind: Kind, e: Stamp): Made | undefined {
  const idx = indexOfStep(kind, work.step);
  if (idx < 0) return undefined;
  const after = kind.steps[idx + 1];
  if (after) return enter(work, kind, after, e, "", true);
  return isDone(work) ? endWork(work, "done", doneWhy(work), e) : undefined;
}

/** Leave the step now, if what must be said first has been: the first step is not left before done when is said. */
export function leave(work: Work, kind: Kind, e: Stamp): Made | undefined {
  if (work.doneWhen === null && indexOfStep(kind, work.step) === 0) return undefined;
  return advanceFrom(work, kind, e);
}

/** Leave the step if each of its leaves is shown by someone who did not do it. */
export function settle(work: Work, kind: Kind, e: Stamp): Made | undefined {
  const step = stepOf(kind, work);
  return step !== undefined && leavesMet(work, step) ? leave(work, kind, e) : undefined;
}
