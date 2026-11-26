import { asks } from "~/modules/asks/service.ts";
import type { Answered, Rule } from "~/modules/asks/types.ts";
import type { AskingDeps, Kept } from "../types.ts";

/** Why "yes" and not another: an approval has the two answers, and only a yes is something to be done again without asking. */
const YES = "yes";

type Always = "thread" | "person" | "kind";

function whenOf(kept: Kept, always: Always): Rule["when"] {
  if (always === "thread") return { thread: kept.ask.about.thread ?? "" };
  return always === "person" ? { person: kept.person } : { kind: kept.kind };
}

/** "Always": a rule for this thread, this person or this kind, only for an action that was approved. It is not made twice. */
function ruleFor(c: AskingDeps, kept: Kept, answer: string, by: string, always: Always | undefined): void {
  if (always === undefined || kept.ask.shows === null || answer !== YES) return;
  const [action, when] = [kept.ask.shows.action, whenOf(kept, always)];
  const known = c.store
    .rules()
    .some((rule) => rule.action === action && JSON.stringify(rule.when) === JSON.stringify(when) && rule.state === "on");
  if (!known) c.store.putRule({ id: c.ids.next("rule"), action, when, by, at: c.clock.now(), right: 0, wrong: 0, state: "on" });
}

/** The answer is kept, then told to whoever asked; if that cannot be done now, it is done again at the next tick. */
export async function settle(c: AskingDeps, kept: Kept, answered: Extract<Answered, { _tag: "Answered" }>): Promise<void> {
  const now: Kept = { ...kept, ask: answered.ask, told: false };
  c.store.put(now);
  const told = await c.tell(now).catch(() => false);
  if (told) c.store.put({ ...now, told: true });
}

export interface Reply {
  readonly by: string;
  readonly answer: string;
  readonly where: string;
  readonly may: boolean;
  readonly always?: Always;
}

/** One answer, from anywhere: the first is kept and told, a later one is told it was late. */
export async function answerOnce(c: AskingDeps, kept: Kept, reply: Reply): Promise<Answered> {
  const answered = asks.answer(kept.ask, { by: reply.by, answer: reply.answer, where: reply.where, at: c.clock.now(), may: reply.may });
  if (answered._tag !== "Answered") return answered;
  ruleFor(c, kept, reply.answer, reply.by, reply.always);
  await settle(c, kept, answered);
  return answered;
}
