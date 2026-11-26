import { works } from "~/modules/work/service.ts";
import type { Item, OpenWork } from "~/modules/intake/types.ts";
import type { ThreadRef, Work } from "~/modules/work/types.ts";
import type { TakeInput, WorkingDeps } from "../types.ts";
import { apply, rearm } from "./events.ts";
import { heardOf, isInside } from "./proposing.ts";

/** `github:acme/web#412` is the conversation 412 of acme/web in GitHub. */
export function refOf(thread: string): ThreadRef | undefined {
  const found = /^([a-z]+):(.+)#([^#]+)$/u.exec(thread);
  const [, connector = "", place = "", id = ""] = found ?? [];
  return found === null ? undefined : { connector, account: connector, place, id };
}

export const threadKey = (ref: ThreadRef): string => `${ref.connector}:${ref.place}#${ref.id}`;

/** What intake counts of work that is open, and which conversations it follows. */
export const openOf = (all: readonly Work[]): readonly OpenWork[] =>
  all
    .filter((work) => work.ended === null)
    .map((work) => ({ id: work.id, manager: work.manager, kind: work.kind, title: work.title, follows: work.follows.map(threadKey) }));

/** What intake decided on becomes a piece of work, once per item: its first step starts. */
export async function take(
  c: WorkingDeps,
  { item, took, answers }: TakeInput,
): Promise<{ readonly work: string } | { readonly _tag: "NoSuchKind"; readonly why: string }> {
  const id = `work_${item.id}`;
  if (c.store.work(id) !== undefined) return { work: id };
  const from = refOf(item.thread) ?? { connector: item.account, account: item.account, place: item.place, id: item.thread };
  const kind = c.playbook(took.version)?.kinds.find((one) => one.id === took.kind);
  if (kind === undefined) return { _tag: "NoSuchKind", why: `There is no kind ${took.kind} in version ${took.version}.` };
  const at = c.clock.now();
  const made = works.take({
    id,
    manager: c.manager.id,
    kind,
    version: took.version,
    title: item.title,
    about: "",
    from,
    asked: item.actor.person ?? item.actor.name,
    answers,
    mandate: took.mandate,
    at,
    waits: took.waits,
  });
  c.store.transaction(() => {
    c.store.see(`take:${id}`);
    c.store.putWork(made.work);
    c.store.addJobs(id, made.todo);
    c.store.addActivity(id, { who: item.actor.name, at, text: `Asked it, on ${from.place} #${from.id}.` });
  });
  rearm(c);
  return { work: id };
}

/** What came in on a conversation that work follows goes to that work. */
export async function heard(c: WorkingDeps, workId: string, item: Item): Promise<void> {
  const from = refOf(item.thread);
  if (from === undefined) return;
  if (isInside(item)) c.store.keep("heard", `${workId}:${item.id}`, heardOf(workId, item, c.clock.now()));
  apply(c, workId, { key: `heard:${workId}:${item.id}`, at: c.clock.now(), is: "heard", from, event: item.event, item: item.text });
}
