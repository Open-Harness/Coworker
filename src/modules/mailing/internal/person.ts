import { mailEvents } from "~/modules/mail-events/service.ts";
import type { ThreadRef } from "~/modules/work/types.ts";
import type { MailAnswer, MailCall, MailingDeps } from "../types.ts";
import { hasOf, threadOf, usOf } from "./around.ts";
import { answerTo } from "./send.ts";

/* What a person does with a conversation of the mailbox: writes as the co-worker (and has it until they hand it back), tells its work something, keeps a draft. */

type Of<K extends MailCall["is"]> = Extract<MailCall, { readonly is: K }>;

const done = (says: string): MailAnswer => ({ is: "done", says, id: null });

export async function write(c: MailingDeps, call: Of<"write">): Promise<MailAnswer> {
  const sent = await answerTo(c, call.id, call.text, `write:${call.key}`, call.person, true);
  const found = mailEvents.conversationOf(c.store.mails(), call.id, usOf(c));
  if (sent.is === "done" && found !== undefined) c.store.setNote(`has:${found.id}`, call.person);
  return sent;
}

export function handBack(c: MailingDeps, call: Of<"hand back">): MailAnswer {
  const found = mailEvents.conversationOf(c.store.mails(), call.id, usOf(c));
  if (found === undefined) return { is: "refused", why: "There is no such conversation." };
  if (hasOf(c, found.id) === "manager") return done("The manager has it already.");
  c.store.setNote(`has:${found.id}`, "");
  return done(`${call.person} handed it back to the manager.`);
}

/** The work that follows the conversation hears what the person said, once by the key. */
export async function tell(c: MailingDeps, call: Of<"tell">): Promise<MailAnswer> {
  const found = mailEvents.conversationOf(c.store.mails(), call.id, usOf(c));
  if (found === undefined) return { is: "refused", why: "There is no such conversation." };
  const thread = threadOf(c.mailbox, found.id);
  const from: ThreadRef = { connector: "email", account: "email", place: c.mailbox, id: found.id };
  let told = 0;
  for (const listener of await c.listeners())
    for (const work of await listener.open()) {
      if (!work.follows.includes(thread)) continue;
      const event = { key: `told:${call.key}`, at: c.clock.now(), is: "heard", from, event: "told", item: call.text } as const;
      await listener.news({ work: work.id, event, says: `${call.person} told ${listener.name}: ${call.text}` });
      told += 1;
    }
  return told === 0 ? { is: "refused", why: "No work follows this conversation, so there is nobody to tell." } : done("Told.");
}

/** A draft stays here until a person sends it. */
export function draft(c: MailingDeps, call: Of<"draft">): MailAnswer {
  const found = mailEvents.conversationOf(c.store.mails(), call.id, usOf(c));
  if (found === undefined) return { is: "refused", why: "There is no such conversation." };
  c.store.setNote(`draft:${found.id}`, JSON.stringify({ by: call.by, text: call.text, at: c.clock.now() }));
  return done("The draft is kept for a person to send.");
}
