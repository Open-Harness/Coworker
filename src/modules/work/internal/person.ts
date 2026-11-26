import type { Kind } from "~/modules/playbook/types.ts";
import { reaches } from "~/modules/reach/service.ts";
import type { Moved, Work, WorkEvent } from "../types.ts";
import { endThreads, endWork } from "./ends.ts";
import { enter, settle } from "./enter.ts";
import { forget } from "./evidence.ts";
import { madeMoved, moved, refuse, same } from "./made.ts";
import { sameJson } from "./same.ts";
import { indexOfStep, stepOf } from "./steps.ts";
import { describeMandate } from "./text.ts";
import { lookMs } from "./time.ts";
import { endThreadsTodo, sayTodo, tellTodo } from "./todo.ts";

type Ev<K extends WorkEvent["is"]> = Extract<WorkEvent, { is: K }>;

/** What done means, said before anything is done and where it was asked. */
export function saidDoneWhen(work: Work, e: Ev<"said done when">, kind: Kind): Moved {
  if (e.checks.length === 0) return refuse("Done when needs at least one thing that must be true.");
  if (work.doneWhen !== null && sameJson(work.doneWhen, e.checks)) return same(work);
  const kept: Work = { ...work, doneWhen: e.checks };
  const text = `${work.title}: done will mean ${e.checks.map((check) => check.says).join("; ")}.`;
  const left = settle(kept, kind, e);
  return moved(left?.work ?? kept, [sayTodo(e, work.from, text), ...(left?.todo ?? [])]);
}

/** A person moves it. Back whenever; past the first step it needs done when. The threads at work end, and the step starts. */
export function movedBy(work: Work, e: Ev<"moved">, kind: Kind): Moved {
  const target = kind.steps.find((step) => step.id === e.step);
  if (target === undefined) return refuse(`There is no step ${e.step} in this kind of work.`);
  if (work.step === target.id) return same(work);
  const there = indexOfStep(kind, target.id);
  if (there > 0 && work.doneWhen === null)
    return refuse("Done when is not said yet: say what done means before moving it past the first step.");
  const back = there < indexOfStep(kind, work.step);
  const base = back ? forget(work, kind, target, e.at) : work;
  const working = base.threads.some((t) => t.state === "working");
  const made = enter(endThreads(base), kind, target, e, `${e.person} moved it to ${target.name}.`, false);
  return moved(made.work, [...(working ? [endThreadsTodo(e)] : []), ...made.todo]);
}

export function stopped(work: Work, e: Ev<"stopped">): Moved {
  return madeMoved(endWork(work, "stopped", e.why, e));
}

export function finishedOutside(work: Work, e: Ev<"finished outside">): Moved {
  return madeMoved(endWork(work, e.as, e.says, e));
}

export function handedOver(work: Work, e: Ev<"handed over">): Moved {
  return madeMoved(endWork(work, "handed over", `Handed over to ${e.manager}, as ${e.work}.`, e));
}

/** A person opens finished work again: it starts where it was, with the mandate it had unless it was taken back. */
export function openedAgain(work: Work, e: Ev<"opened again">, kind: Kind): Moved {
  const mandate = work.mandate.state === "stopped" ? { ...work.mandate, state: "holds" as const } : work.mandate;
  const open: Work = { ...work, ended: null, mandate };
  const step = stepOf(kind, open);
  const note = `${e.person} opened it again: ${e.why}`;
  if (step === undefined) return moved({ ...open, next: { what: "a place to start", who: "itself", by: e.at + lookMs(kind.look) } });
  return madeMoved(enter(open, kind, step, e, note, true));
}

/** The mandate only ever gets smaller. What is working is told. */
export function narrowed(work: Work, e: Ev<"narrowed">): Moved {
  const wider = reaches.wider(work.mandate, e.mandate);
  if (wider.length > 0) return refuse(`That mandate is wider than the one it has: ${wider.join(" ")}`);
  if (sameJson(work.mandate, e.mandate)) return same(work);
  const words = `Your mandate for ${work.title} is narrower now. ${describeMandate(e.mandate)}`;
  const told = work.threads.filter((t) => t.state === "working").map((t) => tellTodo(e, t.id, words));
  return moved({ ...work, mandate: e.mandate }, told);
}
