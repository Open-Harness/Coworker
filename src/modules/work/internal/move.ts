import type { Kind } from "~/modules/playbook/types.ts";
import type { Moved, ToDo, Work, WorkEvent } from "../types.ts";
import { asked, answered, spent } from "./asked.ts";
import { type Stamp, keyOf, same } from "./made.ts";
import { lookMs } from "./time.ts";
import { stepOf } from "./steps.ts";
import { whatOf } from "./text.ts";
import { checked, reported, started, unanswered } from "./report.ts";
import { finishedOutside, handedOver, movedBy, narrowed, openedAgain, saidDoneWhen, stopped } from "./person.ts";
import { due, failed, follows, heard, passed } from "./world.ts";

function apply(work: Work, e: WorkEvent, kind: Kind): Moved {
  switch (e.is) {
    case "started":
      return started(work, e, kind);
    case "said done when":
      return saidDoneWhen(work, e, kind);
    case "reported":
      return reported(work, e, kind);
    case "unanswered":
      return unanswered(work, e, kind);
    case "checked":
      return checked(work, e, kind);
    case "heard":
      return heard(work, e, kind);
    case "follows":
      return follows(work, e);
    case "asked":
      return asked(work, e);
    case "answered":
      return answered(work, e, kind);
    case "passed":
      return passed(work, e, kind);
    case "failed":
      return failed(work, e, kind);
    case "finished outside":
      return finishedOutside(work, e);
    case "due":
      return due(work, e, kind);
    case "spent":
      return spent(work, e, kind);
    case "moved":
      return movedBy(work, e, kind);
    case "stopped":
      return stopped(work, e);
    case "opened again":
      return openedAgain(work, e, kind);
    case "narrowed":
      return narrowed(work, e);
    case "handed over":
      return handedOver(work, e);
  }
}

/** Open work always has a next, with a date; whenever it is new, something wakes it then. */
export function seal(before: Work | null, after: Work, todo: readonly ToDo[], e: Stamp, kind: Kind): { work: Work; todo: readonly ToDo[] } {
  const step = stepOf(kind, after);
  const fallback = { what: step ? whatOf(step) : "a place to start", who: "itself" as const, by: e.at + lookMs(kind.look) };
  const work = after.ended === null && after.next === null ? { ...after, next: fallback } : after;
  const changed = work.ended === null && work.next !== null && JSON.stringify(work.next) !== JSON.stringify(before?.next ?? null);
  if (!changed || work.next === null) return { work, todo };
  return { work, todo: [...todo, { key: keyOf(e, "wake"), do: "wake", at: work.next.by }] };
}

/** Work and an event in; work and what to do about it out. Work that has ended hears nothing but a person opening it again, and open work is not opened. */
export function move(work: Work, event: WorkEvent, kind: Kind): Moved {
  if ((work.ended !== null) !== (event.is === "opened again")) return same(work);
  const out = apply(work, event, kind);
  if (out._tag !== "Moved") return out;
  return { _tag: "Moved", ...seal(work, out.work, out.todo, event, kind) };
}
