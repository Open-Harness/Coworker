import type { Answer, WorkingDeps } from "../types.ts";
import { apply } from "./events.ts";
import { parkedOf } from "./asking.ts";

/* An ask of this work was answered, anywhere: what asked goes on, once. What each kind of ask does is how it was parked. */

const where = (at: string): string => (at === "inbox" ? "in the inbox" : at);

/** How many times the person let it go on past its limit. */
export function raisedOf(c: WorkingDeps, work: string): number {
  let n = 0;
  while (c.store.once(`raised:${work}:${n + 1}`) !== undefined) n += 1;
  return n;
}

/** Returns whether anything is now to be done, so that the caller goes on. */
export function answered(c: WorkingDeps, input: Answer): boolean {
  const parked = parkedOf(c, input.ask);
  const work = c.store.work(input.work);
  if (parked === undefined || work === undefined || c.store.once(`answered:${input.ask}`) !== undefined) return false;
  c.store.keepOnce(`answered:${input.ask}`, JSON.stringify(input));
  c.store.setHold(work.id, null);
  const [key, at] = [`answered:${input.ask}`, c.clock.now()];
  if ((parked.kind === "limit" || parked.kind === "model") && input.option === "stop") {
    apply(c, work.id, { key, at, is: "stopped", person: input.person, why: "It was stopped at its limit, and what it made is kept." });
    return true;
  }
  if (parked.kind === "limit") c.store.keepOnce(`raised:${work.id}:${raisedOf(c, work.id) + 1}`, input.ask);
  const moved = apply(c, work.id, { key, at, is: "answered", ask: input.ask, person: input.person, answer: input.answer });
  // A thread that waits at a call, or at the limit, is not told what it will be given as the call's answer; a model that is tried again needs no words.
  if (moved._tag === "Moved" && parked.kind !== "plain")
    for (const todo of moved.todo) if (todo.do === "tell thread") c.store.finishJob(todo.key);
  if ((parked.kind === "tool" || parked.kind === "limit") && parked.thread !== null)
    c.store.addJobs(work.id, [{ key: `resume:${input.ask}`, do: "resume", thread: parked.thread }]);
  if (input.where === "inbox" && work.ended === null)
    c.store.addJobs(work.id, [
      { key: `${key}:said`, do: "say", where: work.from, text: `${input.person} answered ${where(input.where)}: ${input.answer}.` },
    ]);
  return true;
}
