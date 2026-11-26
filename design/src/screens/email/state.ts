import { ME, type Conversation, type Item, type Message } from "./data";

/** Every change to the list of conversations, as a pure function: the page keeps the list and applies these. */
const NOW = "25 Nov, 09:54";
type Change = (c: Conversation) => Conversation;
export const change = (all: Conversation[], ids: ReadonlySet<string> | string, f: Change): Conversation[] =>
  all.map((c) => ((typeof ids === "string" ? ids === c.id : ids.has(c.id)) ? f(c) : c));

const add = (c: Conversation, item: Item): Item[] => [...c.thread, item];
const nextId = (c: Conversation) => `${c.id}-x${c.thread.length}`;

export const setUnread = (isUnread: boolean): Change => (c) => ({ ...c, isUnread });
export const markDone: Change = (c) => ({ ...c, category: "done" });

/** "Tell Juno": goes to the manager, the customer does not see it. */
export const tell = (text: string): Change => (c) => ({ ...c, thread: add(c, { kind: "note", id: nextId(c), text: `You told Support: ${text}` }) });

/** "Write as Juno": goes to the customer, and the conversation is yours until you hand it back. */
export const write = (text: string): Change => (c) => {
  const took: Item[] = c.owner ? [] : [{ kind: "note", id: `${nextId(c)}n`, text: `${ME} took over` }];
  const message: Message = { kind: "message", id: nextId(c), sender: "Juno", from: `Written by ${ME}, as Juno`, at: NOW, body: [text] };
  return { ...c, owner: ME, category: "person", thread: [...c.thread, ...took, message] };
};

export const handBack: Change = (c) => {
  const { owner: _owner, ...rest } = c;
  return { ...rest, category: "waiting", thread: add(c, { kind: "note", id: nextId(c), text: `${ME} handed it back to Support` }) };
};

export const changeDraft = (draftId: string, text: string): Change => (c) => ({
  ...c, thread: c.thread.map((t) => (t.kind === "draft" && t.id === draftId ? { ...t, body: text.split("\n\n").filter(Boolean) } : t)),
});

/** A yes: the draft goes out as Support's own mail. */
export const sendDraft = (draftId: string): Change => (c) => ({
  ...c, category: "done", thread: c.thread.map((t): Item => (t.kind === "draft" && t.id === draftId ? { kind: "message", id: t.id, sender: "Juno", from: "Written by Support", at: NOW, body: t.body } : t)),
});
