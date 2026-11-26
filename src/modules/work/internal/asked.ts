import type { Kind } from "~/modules/playbook/types.ts";
import type { Moved, Work, WorkEvent } from "../types.ts";
import { ask } from "./ask.ts";
import { advanceFrom, enter, stay } from "./enter.ts";
import { madeMoved, moved, refuse, same } from "./made.ts";
import { stepOf } from "./steps.ts";
import { tellTodo } from "./todo.ts";

type Ev<K extends WorkEvent["is"]> = Extract<WorkEvent, { is: K }>;

/** It waits for that person, by that date. A new wait is a new thing to say if it goes quiet. */
export function asked(work: Work, e: Ev<"asked">): Moved {
  if (work.waits?.ask === e.ask && work.waits.person === e.person) return same(work);
  const next = { what: `an answer from ${e.person}`, who: { person: e.person }, by: e.by };
  return moved({ ...work, waits: { ask: e.ask, person: e.person }, chased: false, next });
}

/**
 * The ask it waits for is answered. On a person's step that is the step done, and it goes on. Elsewhere whoever is working is told
 * what was said, or the step's agent is started with it.
 */
export function answered(work: Work, e: Ev<"answered">, kind: Kind): Moved {
  if (work.waits === null || work.waits.ask !== e.ask) return refuse(`${e.ask} is not the ask this work waits for.`);
  const free: Work = { ...work, waits: null, chased: false };
  const step = stepOf(kind, work);
  const said = `${e.person} answered: ${e.answer}`;
  if (step !== undefined && "person" in step.by) return madeMoved(advanceFrom(free, kind, e) ?? stay(free, kind, e));
  const live = free.threads.filter((t) => t.state === "working");
  if (live.length > 0) {
    const told = live.map((t) => tellTodo(e, t.id, `${free.title}: ${said}`));
    return moved(stay(free, kind, e).work, told);
  }
  return madeMoved(step === undefined ? stay(free, kind, e) : enter(free, kind, step, e, said, true));
}

const LIMIT: Readonly<Record<"work" | "manager" | "workspace", string>> = {
  work: "This work has used more than its own limit.",
  manager: "The manager of this work has used more than its limit.",
  workspace: "The workspace has used more than its limit.",
};

/** The cost so far is kept, as the total. Over a limit it asks who answers for the work, and keeps everything it made. */
export function spent(work: Work, e: Ev<"spent">, kind: Kind): Moved {
  if (work.cost === e.cost) return same(work);
  const kept: Work = { ...work, cost: e.cost };
  if (e.over === null) return moved(kept);
  const question = `${work.title}: ${LIMIT[e.over]} It has cost ${e.cost}. Raise the limit, or say stop.`;
  return madeMoved(ask(kept, kind, e, work.answers, "decide", question));
}
