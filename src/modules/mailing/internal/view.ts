import { mailEvents } from "~/modules/mail-events/service.ts";
import type { Conversation as Known, MailRecord, Mails } from "~/modules/mail-events/types.ts";
import type { Conversation, ConversationView, Entry, MailView } from "~/modules/views-connector/types.ts";
import type { MailingDeps } from "../types.ts";
import { hasOf, isOurs, isPerson, threadOf, usOf } from "./around.ts";

/* The mailbox as a mail client shows it: conversations, and in each what was written, oldest first. No tool call and no reasoning is in it. */

const PREVIEW = 120;

const written = (mails: Mails, known: Known): readonly MailRecord[] =>
  known.mails.flatMap((id) => (mails[id] === undefined || mails[id].is === "report" ? [] : [mails[id]]));

async function worksOf(
  c: MailingDeps,
): Promise<readonly { readonly id: string; readonly title: string; readonly follows: readonly string[] }[]> {
  return (await Promise.all((await c.listeners()).map((one) => one.open()))).flat();
}

function conversationOf(c: MailingDeps, mails: Mails, known: Known, works: Awaited<ReturnType<typeof worksOf>>): Conversation {
  const list = written(mails, known);
  const theirs = list.filter((mail) => !isOurs(c, mail));
  const last = list.at(-1);
  const person = known.people[0] ?? "";
  const thread = threadOf(c.mailbox, known.id);
  const work = works.find(({ follows }) => follows.includes(thread));
  const unread = list.slice(list.findLastIndex((mail) => isOurs(c, mail)) + 1).filter((mail) => !isOurs(c, mail) && isPerson(mail)).length;
  const had = hasOf(c, known.id);
  return {
    id: known.id,
    with: theirs.find((mail) => mail.from.address === person)?.from.name || person,
    address: person,
    subject: (theirs[0] ?? list[0])?.subject ?? "",
    preview: (last?.text ?? "").replaceAll(/\s+/gu, " ").slice(0, PREVIEW),
    at: last?.at ?? 0,
    unread,
    waits: known.waits === "us" ? (had === "manager" ? "us" : "person") : known.waits === "them" ? "them" : "done",
    tags: [],
    work: work?.id ?? null,
    workTitle: work?.title ?? null,
    lastIs: last !== undefined && isOurs(c, last) ? "ours" : "them",
    thread,
    has: had,
    group: null,
    saved: false,
    stopped: known.closedTo.length > 0 && known.closedTo.includes(person),
  };
}

export async function mailView(c: MailingDeps): Promise<MailView> {
  const [mails, works] = [c.store.mails(), await worksOf(c)];
  const all = mailEvents.conversations(mails, usOf(c)).map((known) => conversationOf(c, mails, known, works));
  return { mailbox: c.mailbox, conversations: all.toSorted((a, b) => b.at - a.at) };
}

function entryOf(c: MailingDeps, mail: MailRecord): Entry {
  if (isOurs(c, mail)) {
    const by = JSON.parse(c.store.note(`by:${mail.id}`) ?? "null") as { name?: string; person?: boolean } | null;
    return { id: mail.id, at: mail.at, is: "out", by: by?.name ?? c.name(), person: by?.person === true, text: mail.text, sent: true };
  }
  return {
    id: mail.id,
    at: mail.at,
    is: "in",
    by: mail.from.name === "" ? mail.from.address : mail.from.name,
    address: mail.from.address,
    text: mail.whole,
    files: [],
  };
}

export async function conversationView(c: MailingDeps, id: string): Promise<ConversationView | undefined> {
  const mails = c.store.mails();
  const known = mailEvents.conversationOf(mails, id, usOf(c));
  if (known === undefined) return undefined;
  const draft = JSON.parse(c.store.note(`draft:${known.id}`) ?? "null") as { by: string; text: string; at: number } | null;
  const stream: Entry[] = written(mails, known).map((mail) => entryOf(c, mail));
  if (draft !== null) stream.push({ id: `draft:${known.id}`, at: draft.at, is: "draft", by: draft.by, text: draft.text, ask: "" });
  return { conversation: conversationOf(c, mails, known, await worksOf(c)), stream };
}

/** What the mailbox holds that says these words, one line each. */
export function search(c: MailingDeps, words: string): readonly string[] {
  const wanted = words
    .toLowerCase()
    .split(/\s+/u)
    .filter((one) => one !== "");
  return Object.values(c.store.mails())
    .filter((mail) => mail.is !== "report" && wanted.every((one) => `${mail.subject} ${mail.whole}`.toLowerCase().includes(one)))
    .toSorted((a, b) => a.at - b.at)
    .map(
      (mail) =>
        `${isOurs(c, mail) ? "We wrote" : mail.from.address} (${mail.subject}): ${mail.text.replaceAll(/\s+/gu, " ").slice(0, 300)}`,
    );
}
