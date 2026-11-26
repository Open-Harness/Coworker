import { CheckCircleIcon, EnvelopeIcon, EnvelopeOpenIcon } from "@heroicons/react/24/outline";
import type { Conversation } from "./data.ts";

export interface RowAction {
  id: "read" | "done";
  label: string;
  icon: typeof CheckCircleIcon;
}

/** What you can do to a conversation without opening it: the row on hover, the pane's header once it is open. */
export function actionsFor(item: Conversation): RowAction[] {
  const read: RowAction = item.isUnread
    ? { id: "read", label: "Mark as read", icon: EnvelopeOpenIcon }
    : { id: "read", label: "Mark as unread", icon: EnvelopeIcon };
  return item.category === "done" ? [read] : [read, { id: "done", label: "Mark as done", icon: CheckCircleIcon }];
}

export type Act = (id: RowAction["id"], ids: ReadonlySet<string> | string) => void;
