import type { Chat } from "~/modules/coworker/types.ts";
import type { ChatView } from "~/modules/views-workspace/types.ts";

/* A chat of a person with the co-worker, as it is kept by the workspace, and as a page is shown it. Pure. */

/** What the co-worker did in a line: a doing, and where it stands. `ask` is the ask a person says yes to, and `to` the one it waits for. */
export interface ChatDid {
  readonly doing: string;
  readonly says: string;
  readonly link: string | null;
  readonly state: "done" | "waits for you" | "refused";
  readonly ask?: string;
  readonly to?: string;
  readonly showMe?: { readonly doing: string; readonly values: Readonly<Record<string, string>> };
}

/** One line as it is kept. `upto`: how many messages of the conversation there were once it was said. */
export interface ChatLineRow {
  readonly id: string;
  /** A person's id, or `coworker`. */
  readonly by: string;
  readonly at: number;
  readonly text: string;
  readonly upto?: number;
  readonly did?: readonly ChatDid[];
  readonly from?: readonly { readonly label: string; readonly link: string }[];
  readonly calls?: ChatView["lines"][number]["calls"];
}

/** A chat of one person. A fork is `under` the chat it was forked from, and `knew` how many of that chat's lines it knows. */
export interface ChatRow {
  readonly id: string;
  readonly by: string;
  readonly title: string;
  readonly at: number;
  readonly lines: readonly ChatLineRow[];
  readonly under?: string | null;
  readonly knew?: number | null;
}

export const COWORKER = "coworker";

export interface Talks {
  /** The chat in a list: whom it is with, and whether it waits for a person's yes. */
  readonly chat: (row: ChatRow, name: string) => Chat;
  /** The chat with its lines, and the chats forked from it. */
  readonly view: (row: ChatRow, all: readonly ChatRow[], name: string) => ChatView;
}
