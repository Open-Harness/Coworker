import { mailEvents } from "~/modules/mail-events/service.ts";
import type { MailRecord } from "~/modules/mail-events/types.ts";
import type { MailAnswer, MailingDeps } from "../types.ts";
import { hasOf, isOurs, isPerson, usOf } from "./around.ts";

/* What leaves as the co-worker: once for each key, never to an address that cannot be written to, kept as a mail of ours so that its answers and its reports find it. */

export interface Out {
  readonly to: readonly string[];
  readonly subject: string;
  readonly text: string;
  readonly inReplyTo: string | null;
  readonly refs: readonly string[];
  readonly key: string;
  /** Who wrote it: a manager (its name), or a person. */
  readonly by: string;
  readonly person: boolean;
}

const refused = (why: string): MailAnswer => ({ is: "refused", why });
const angled = (id: string): string => (id.startsWith("<") ? id : `<${id}>`);

function ours(c: MailingDeps, out: Out, to: string, id: string): MailRecord {
  return {
    id,
    is: "person",
    from: { address: c.mailbox.toLowerCase(), name: c.name() },
    replyTo: null,
    to: [{ address: to.toLowerCase(), name: "" }],
    cc: [],
    subject: out.subject,
    at: c.clock.now(),
    inReplyTo: out.inReplyTo,
    refs: out.refs,
    text: out.text,
    whole: out.text,
    proof: { proven: true, by: null, refused: false },
    reports: [],
    attachments: [],
  };
}

/** Sends to each address, and keeps each as a mail of ours. The same key again finds what the first did. */
export async function sendOut(c: MailingDeps, out: Out): Promise<MailAnswer> {
  const done = c.store.note(`once:${out.key}`);
  if (done !== undefined) return { is: "done", says: `Sent to ${out.to.join(", ")}.`, id: done };
  let first: string | null = null;
  for (const to of out.to) {
    const sent = await c.mailer.send({
      from: c.mailbox,
      fromName: c.name(),
      to,
      subject: out.subject,
      text: out.text,
      ...(out.inReplyTo === null ? {} : { headers: { "In-Reply-To": out.inReplyTo, References: out.refs.join(" ") } }),
    });
    if (sent._tag === "Failed") return { is: "failed", why: sent.reason };
    const id = angled(sent.messageId);
    c.store.put(ours(c, out, to, id));
    c.store.setNote(`by:${id}`, JSON.stringify({ name: out.by, person: out.person }));
    first ??= id;
  }
  c.store.setNote(`once:${out.key}`, first ?? "");
  return { is: "done", says: `Sent to ${out.to.join(", ")}.`, id: first };
}

/** The answer to the last thing a person wrote in a conversation: to whom it goes is `mail-events`' to say. */
export async function answerTo(
  c: MailingDeps,
  conversation: string,
  text: string,
  key: string,
  by: string,
  person: boolean,
): Promise<MailAnswer> {
  const mails = c.store.mails();
  const found = mailEvents.conversationOf(mails, conversation, usOf(c));
  if (found === undefined) return refused("There is no such conversation.");
  const had = hasOf(c, found.id);
  if (!person && had !== "manager") return refused(`${had.person} has this conversation, so it is theirs until they hand it back.`);
  const last = found.mails.map((id) => mails[id]).findLast((mail) => mail !== undefined && !isOurs(c, mail) && isPerson(mail));
  if (last === undefined) return refused("There is nothing in it that a person wrote, so there is nothing to answer.");
  const answer = mailEvents.answer(mails, last.id, usOf(c));
  if (answer._tag === "No") return refused(`It cannot be answered: ${answer.why}.`);
  return sendOut(c, { to: answer.to, subject: answer.subject, text, inReplyTo: answer.inReplyTo, refs: answer.refs, key, by, person });
}

/** A new mail, to someone: inside the workspace without asking, outside after a person said yes (that is the caller's). */
export function compose(
  c: MailingDeps,
  to: string,
  subject: string,
  text: string,
  key: string,
  by: string,
  inside: boolean,
): Promise<MailAnswer> | MailAnswer {
  const address = to.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/u.test(address)) return refused(`"${to}" is not an address.`);
  if (c.addresses.some((one) => one.toLowerCase() === address)) return refused("That is our own address.");
  if (inside && c.known(address) === null) return refused(`${address} is not someone inside this workspace.`);
  const closed = mailEvents.conversations(c.store.mails(), usOf(c)).some(({ closedTo }) => closedTo.includes(address));
  if (closed) return refused(`${address} cannot be written to: there is no such address, or they complained.`);
  return sendOut(c, { to: [address], subject, text, inReplyTo: null, refs: [], key, by, person: false });
}
