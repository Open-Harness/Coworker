/** Where a conversation stands, which is also which tab it shows under. `inbox` is the tab that shows all of them. */
export type Category = "inbox" | "waiting" | "person" | "done";
export type Standing = Exclude<Category, "inbox">;

export interface Attachment {
  id: string;
  name: string;
  src: string;
}

/** What a customer or Support wrote. `from` is the address, or for Support the line that says who sent it. */
export interface Message {
  kind: "message";
  id: string;
  sender: string;
  from: string;
  at: string;
  body: string[];
  attachments?: Attachment[];
}
/** One quiet line in the stream: "Handed to Coding", "You told Support: ...". */
export interface Note {
  kind: "note";
  id: string;
  text: string;
}
/** A mail Support has written and not sent: it waits for a yes. `ask` is the yes. */
export interface Draft {
  kind: "draft";
  id: string;
  at: string;
  body: string[];
  ask: string;
}
export type Item = Message | Note | Draft;

export interface Conversation extends Record<string, unknown> {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  preview: string;
  tags: string[];
  /** Short form for the row; the pane shows each message's own time. */
  receivedAt: string;
  isUnread: boolean;
  category: Standing;
  /** The work it became. */
  task?: string;
  /** The thread of that work, where it has one. */
  thread_?: string;
  /** Who took over from Support, if anyone. */
  owner?: string;
  attachments: Attachment[];
  thread: Item[];
}

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "inbox", label: "All" },
  { value: "waiting", label: "Waiting for us" },
  { value: "person", label: "With a person" },
  { value: "done", label: "Done" },
];

/** One predicate, so a tab's count is exactly what the tab will show. */
export function inCategory(item: Conversation, category: Category): boolean {
  return category === "inbox" || item.category === category;
}

export function countsByCategory(all: readonly Conversation[]): Record<Category, number> {
  const counts: Record<Category, number> = { inbox: 0, waiting: 0, person: 0, done: 0 };
  for (const item of all) for (const { value } of CATEGORIES) if (inCategory(item, value)) counts[value] += 1;
  return counts;
}

export function matches(item: Conversation, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  const text = [
    item.sender,
    item.senderEmail,
    item.subject,
    item.task ?? "",
    ...item.thread.flatMap((t) => (t.kind === "note" ? [t.text] : t.body)),
  ];
  return text.some((t) => t.toLowerCase().includes(q));
}

export const attachmentsOf = (thread: Item[]): Attachment[] => thread.flatMap((t) => (t.kind === "message" ? (t.attachments ?? []) : []));
