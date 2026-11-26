import { asks } from "~/modules/asks/service.ts";
import type { Ask, NewAsk } from "~/modules/asks/types.ts";
import type { InboxItem, InboxView } from "~/modules/views-workspace/types.ts";
import type { ConsoleDeps } from "../types.ts";

/* What waits for a person: asks, each to one person. The ones the co-worker makes of what it tried are kept here. */

const KIND = "ask";
const DAY = 86_400_000;

/** An ask, made once the way `asks` says it may be, and kept for the person it is to. */
export async function askAPerson(c: ConsoleDeps, input: Omit<NewAsk, "by"> & { readonly inDays: number }): Promise<Ask | string> {
  const { inDays, ...rest } = input;
  const made = asks.ask({ ...rest, by: c.clock.now() + inDays * DAY }, c.clock.now());
  if (made._tag === "Refused") return made.why;
  await c.store.keep(KIND, made.ask.id, made.ask);
  return made.ask;
}

const itemOf = (ask: Ask): InboxItem => ({
  ask,
  from: "Juno",
  preview: ask.question,
  standing: ask.state._tag === "Open" ? "asks" : "done",
  proposes: ask.need === "review",
  isNew: ask.state._tag === "Open",
  looked: [],
  otherwise: ask.else === "wait" ? null : `If nobody answers: ${ask.else.option}`,
  links: [],
  beside: {},
});

/** What is to this person, newest first. An Owner sees what is to any Owner. */
export async function inboxView(c: ConsoleDeps): Promise<InboxView> {
  const all = (await c.store.kept(KIND)) as readonly Ask[];
  return {
    items: all
      .filter((ask) => ask.to === c.who.id || c.who.role === "Owner")
      .toReversed()
      .map(itemOf),
  };
}
