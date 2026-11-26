import type { Kind } from "~/modules/playbook/types.ts";
import type { Evidence, Moved, ThreadRef, Work, WorkEvent } from "../types.ts";
import { agentTodos, settle } from "./enter.ts";
import { addEvidence, hasEvidence } from "./evidence.ts";
import { fail } from "./fail.ts";
import { madeMoved, moved, refuse, same } from "./made.ts";
import { stepOf } from "./steps.ts";
import { whatOf } from "./text.ts";
import { lookMs } from "./time.ts";
import { sayTodo, tellTodo } from "./todo.ts";

type Ev<K extends WorkEvent["is"]> = Extract<WorkEvent, { is: K }>;

export function sameThread(a: ThreadRef, b: ThreadRef): boolean {
  return a.connector === b.connector && a.account === b.account && a.place === b.place && a.id === b.id;
}

export function follows(work: Work, e: Ev<"follows">): Moved {
  if (work.follows.some((seen) => sameThread(seen, e.thread))) return same(work);
  return moved({ ...work, follows: [...work.follows, e.thread] });
}

/** What happened on a thread it follows goes to whoever is working. Nobody working, and waiting outside: its agent wakes. */
export function heard(work: Work, e: Ev<"heard">, kind: Kind): Moved {
  const { from } = e;
  if (!work.follows.some((seen) => sameThread(seen, from)))
    return refuse(`${from.place} ${from.id} is not a conversation this work follows.`);
  const news = `New on ${from.place} ${from.id}: ${e.event} ${e.item}.`;
  const live = work.threads.filter((t) => t.state === "working");
  if (live.length > 0)
    return moved(
      work,
      live.map((t) => tellTodo(e, t.id, news)),
    );
  const step = stepOf(kind, work);
  if (step === undefined || work.next?.who !== "outside") return same(work);
  const todo = agentTodos(work, kind, step, e, news);
  if (todo.length === 0) return same(work);
  return moved({ ...work, chased: false, next: { what: whatOf(step), who: "itself", by: e.at + lookMs(kind.look) } }, todo);
}

/** A person who is named is the evidence's own; code (CI, a connector) and a person with no name are code's word. */
function whoSays(by: "ci" | "person" | "connector", person: string | undefined): Evidence["by"] {
  return by === "person" && person !== undefined ? { person } : { code: true };
}

/** Something is shown true by code, or a person. It goes on record, and the step goes on if that was what it needed. */
export function passed(work: Work, e: Ev<"passed">, kind: Kind): Moved {
  const by = whoSays(e.by, e.person);
  const says = "person" in by ? `Check ${e.check} passed, said by ${by.person}.` : `Check ${e.check} passed.`;
  const item: Evidence = { check: e.check, met: true, says, by, at: e.at };
  if (hasEvidence(work, item)) return same(work);
  const kept = addEvidence(work, [item]);
  const left = settle(kept, kind, e);
  return left ? madeMoved(left) : moved(kept);
}

/** Something is shown not true. It goes on record, and if it was what the step needs, the step's word says what happens. */
export function failed(work: Work, e: Ev<"failed">, kind: Kind): Moved {
  const by = whoSays(e.by, e.person);
  const item: Evidence = { check: e.check, met: false, says: e.says, by, at: e.at };
  if (hasEvidence(work, item)) return same(work);
  const kept = addEvidence(work, [item]);
  const step = stepOf(kind, work);
  if (step === undefined || !step.leaves.some((leave) => leave.id === e.check)) return moved(kept);
  return madeMoved(fail(kept, kind, step, e.says, e));
}

/** Quiet past its date: it looks, says once what it waits for, and looks again later. */
export function due(work: Work, e: Ev<"due">, kind: Kind): Moved {
  const next = work.next;
  if (next === null || e.at < next.by) return same(work);
  const moreWork: Work = { ...work, chased: true, next: { ...next, by: e.at + lookMs(kind.look) } };
  if (work.chased) return moved(moreWork);
  return moved(moreWork, [sayTodo(e, work.from, `Still waiting on ${work.title}: ${next.what}.`)]);
}
