import { mailEvents } from "~/modules/mail-events/service.ts";
import type { MailRecord } from "~/modules/mail-events/types.ts";
import type { Item } from "~/modules/intake/types.ts";
import type { MailAnswer, MailCall, MailingDeps } from "../types.ts";
import { isPerson, threadOf, usOf } from "./around.ts";

type Hear = Extract<MailCall, { readonly is: "hear" }>;

const heard = (kind: Extract<MailAnswer, { readonly is: "heard" }>["heard"], why = ""): MailAnswer => ({ is: "heard", heard: kind, why });

const NOT_PROVEN =
  "It is not proven to be from who it says: our own mail server saw no signature (DKIM) of its domain, so it is kept and is not judged or asked about.";

/** What a person's mail is, as an item for intake: who wrote it, to whom, and in which conversation. */
function itemOf(c: MailingDeps, mail: MailRecord, conversation: string, person: string | null): Omit<Item, "id" | "trigger"> {
  return {
    by: "event",
    account: "email",
    place: c.mailbox,
    thread: threadOf(c.mailbox, conversation),
    event: "mail",
    actor: {
      address: `mail:${mail.from.address}`,
      name: mail.from.name === "" ? mail.from.address : mail.from.name,
      bot: false,
      ...(person === null ? {} : { person }),
      standing: person === null ? "outside" : "inside",
    },
    addressed: true,
    at: mail.at,
    title: mail.subject,
    text: mail.text,
    same: `email:${mail.id}`,
  };
}

/** A mail arrived: it is read, kept once, what became true of its conversation is made news, and what a person wrote becomes an item. */
export async function hear(c: MailingDeps, call: Hear): Promise<MailAnswer> {
  const us = usOf(c, call.server);
  const read = await mailEvents.read(call.raw, { from: call.from, to: call.to, at: call.at }, us);
  if (read._tag === "Broken") return heard("Broken", read.why);
  if (read._tag === "Noise") return heard("Noise", read.why);
  const { mail } = read;
  const before = c.store.mails();
  const after = mailEvents.keep(before, mail);
  if (after === before) return heard("Same");
  c.store.put(mail);
  // What a person wrote is judged by intake, which knows who may ask: it is not told from here.
  c.store.addNews(
    mailEvents.told(before, after, us).filter(({ is }) => is !== "wrote"),
    c.clock.now(),
  );
  const conversation = mailEvents.conversationOf(after, mail.id, us);
  if (!isPerson(mail) || conversation === undefined) return heard("Kept");
  const hears = (await c.listeners()).map(({ manager }) => manager);
  if (hears.length === 0) return heard("Kept");
  const person = mail.proof.proven ? c.known(mail.from.address) : null;
  c.keep(itemOf(c, mail, conversation.id, person), "mail", hears, mail.proof.proven ? null : NOT_PROVEN);
  return heard("Kept");
}
