import type { Clock } from "~/modules/page/types.ts";
import type { Conversation } from "~/modules/views-connector/types.ts";

export type ChatState = "waiting" | "person" | "done";
/** One chat in the list: what the number's view says of a conversation, in the words the row uses. */
export interface Chat {
  readonly id: string;
  readonly name: string;
  readonly about: string;
  readonly state: ChatState;
  readonly unread: number;
  readonly isGroup: boolean;
  readonly stopped: boolean;
  readonly work: { readonly id: string; readonly title: string } | undefined;
  /** The last line, as the row shows it: "Not sent yet: …", "Desk: …". */
  readonly last: string;
  readonly time: string;
}
export const FILTERS = [
  { id: "all", label: "All" },
  { id: "waiting", label: "Waiting for us" },
  { id: "person", label: "With a person" },
  { id: "done", label: "Done" },
] as const;
export type FilterId = (typeof FILTERS)[number]["id"];

const STATE: Readonly<Record<Conversation["waits"], ChatState>> = { us: "waiting", them: "waiting", person: "person", done: "done" };

const aboutOf = (c: Conversation): string => (c.group !== null ? `Group, ${c.group} people` : c.saved ? c.address : "Number not saved");

const lastOf = (c: Conversation): string => `${c.lastIs === "unsent" ? "Not sent yet: " : c.lastIs === "ours" ? "Desk: " : ""}${c.preview}`;

export function chatOf(c: Conversation, clock: Clock): Chat {
  return {
    id: c.id,
    name: c.with,
    about: aboutOf(c),
    state: STATE[c.waits],
    unread: c.unread,
    isGroup: c.group !== null,
    stopped: c.stopped,
    work: c.work === null ? undefined : { id: c.work, title: c.workTitle ?? c.work },
    last: lastOf(c),
    time: clock.time(c.at),
  };
}
