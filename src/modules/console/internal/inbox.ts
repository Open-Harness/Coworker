import type { Answer } from "~/modules/api/types.ts";
import { asks } from "~/modules/asks/service.ts";
import type { Ask, NewAsk } from "~/modules/asks/types.ts";
import type { Kept } from "~/modules/asking/types.ts";
import type { InboxItem, InboxView } from "~/modules/views-workspace/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { ok, problem } from "./around.ts";

/* What waits for this person, and their answer. The workspace keeps the asks; the console shows them and carries the answer. */

const PREVIEW = 90;

const otherwise = ({ ask, otherwise: said }: Kept): string => {
  if (said !== null) return said;
  if (ask.else === "wait") return "Nothing is done until you answer. It asks again once if it goes quiet.";
  const { option } = ask.else;
  return `If nobody answers: ${ask.options.find(({ id }) => id === option)?.label ?? option}.`;
};

const itemOf = (kept: Kept): InboxItem => ({
  ask: kept.ask,
  from: kept.from,
  preview: kept.ask.question.length > PREVIEW ? `${kept.ask.question.slice(0, PREVIEW - 1)}…` : kept.ask.question,
  standing: kept.ask.need === "know" ? "know" : "asks",
  proposes: false,
  isNew: kept.ask.reminded === 0,
  looked: kept.looked,
  otherwise: otherwise(kept),
  links: kept.links,
  beside: {},
});


const KEPT = "ask";
const DAY = 86_400_000;

/** An ask the co-worker makes of what it tried: made once the way `asks` says it may be, and kept for the person it is to. */
export async function askAPerson(c: ConsoleDeps, input: Omit<NewAsk, "by"> & { readonly inDays: number }): Promise<Ask | string> {
  const { inDays, ...rest } = input;
  const made = asks.ask({ ...rest, by: c.clock.now() + inDays * DAY }, c.clock.now());
  if (made._tag === "Refused") return made.why;
  await c.store.keep(KEPT, made.ask.id, made.ask);
  return made.ask;
}

const keptItem = (ask: Ask): InboxItem => ({
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

/** What the co-worker asked of this person; an Owner sees what is to any Owner. */
async function keptItems(c: ConsoleDeps): Promise<readonly InboxItem[]> {
  const all = (await c.store.kept(KEPT)) as readonly Ask[];
  return all
    .filter((ask) => ask.to === c.who.id || c.who.role === "Owner")
    .toReversed()
    .map(keptItem);
}

/** Every ask of this person that is open: the ask in full, and its options. What is answered is gone from here. */
export async function inboxItems(c: ConsoleDeps): Promise<readonly InboxItem[]> {
  const asked = await c.asks({ op: "inbox", person: c.who.id });
  return [...(await keptItems(c)), ...(asked.op === "inbox" ? asked.items.map(itemOf) : [])];
}

export async function inboxView(c: ConsoleDeps): Promise<InboxView> {
  return { items: await inboxItems(c) };
}

const ALWAYS = ["thread", "person", "kind"] as const;

/** An answer from the inbox: the first counts, a later one is told it was late, and one that may not answer is refused in words. */
export async function answerAsk(c: ConsoleDeps, ask: string, body: unknown): Promise<Answer<unknown>> {
  const sent = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  if (typeof sent["answer"] !== "string") return problem(422, "Send {answer}: one of the options of the ask, or what you say.");
  const always = ALWAYS.find((one) => one === sent["always"]);
  const by = { id: c.who.id, name: c.who.name, role: c.who.role };
  const answered = await c.asks({ op: "answer", ask, by, answer: sent["answer"], ...(always === undefined ? {} : { always }) });
  if (answered.op !== "answer" || answered.answered._tag === "NoSuchAsk") return problem(404, "There is no such ask here.");
  return ok(answered.answered);
}
