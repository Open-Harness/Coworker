import type { Clock } from "~/modules/page/types.ts";
import type { Conversation as Listed, Entry } from "~/modules/views-connector/types.ts";
import { whenOf } from "../connectors/when.ts";
import { attachmentsOf, type Conversation, type Item, type Standing } from "./data.ts";

const STANDING: Readonly<Record<Listed["waits"], Standing>> = { us: "waiting", them: "waiting", person: "person", done: "done" };

/** What the console says of a conversation is one row of the list, until it is opened and brings its stream. */
export function rowOf(c: Listed, clock: Clock, thread: readonly Item[]): Conversation {
  const items = [...thread];
  return {
    id: c.id,
    sender: c.with,
    senderEmail: c.address,
    subject: c.subject,
    preview: c.preview,
    tags: [...c.tags],
    receivedAt: clock.short(c.at),
    isUnread: c.unread > 0,
    category: STANDING[c.waits],
    ...(c.work === null ? {} : { task: c.work }),
    ...(c.thread === null ? {} : { thread_: c.thread }),
    ...(c.has === "manager" ? {} : { owner: c.has.person }),
    attachments: attachmentsOf(items),
    thread: items,
  };
}

/** A stream as the thread shows it: messages that fold, quiet lines between, and the mail that waits for a yes. */
export function threadOf(stream: readonly Entry[], clock: Clock, zone: string, who: string): Item[] {
  const items: Item[] = [];
  for (const entry of stream) {
    const at = whenOf(entry.at, clock, zone);
    if (entry.is === "in") {
      const attachments = entry.files.map((f, n) => ({ id: `${entry.id}-a${n}`, name: f.name, src: f.link }));
      items.push({
        kind: "message",
        id: entry.id,
        sender: entry.by,
        from: entry.address,
        at,
        body: entry.text.split("\n\n"),
        ...(attachments.length === 0 ? {} : { attachments }),
      });
    } else if (entry.is === "out")
      items.push({
        kind: "message",
        id: entry.id,
        sender: who,
        from: `Written by ${entry.person ? `${entry.by}, as ${who}` : entry.by}`,
        at,
        body: entry.text.split("\n\n"),
      });
    else if (entry.is === "draft") items.push({ kind: "draft", id: entry.id, at, body: entry.text.split("\n\n"), ask: entry.ask });
    else if (entry.is === "note") items.push({ kind: "note", id: entry.id, text: entry.text });
  }
  return items;
}
