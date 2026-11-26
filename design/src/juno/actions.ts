/* The one list of what can be done here. A button, Juno, the palette and a walkthrough are four ways to the same entry. */

export type Permission = "on" | "ask" | "off";
export interface Action {
  readonly id: string; readonly label: string; readonly group: "Managers" | "Work" | "Chats" | "Connectors" | "Settings";
  /** Where a person does it: the page, and the button on it. This is what Juno points at. */
  readonly at: { readonly page: string; readonly press: string };
  /** The fields a person fills, in order, by the same name the action takes them. */
  readonly fields: readonly string[]; readonly juno: Permission; readonly keys?: string; readonly go: string;
}
export const ACTIONS: readonly Action[] = [
  { id: "manager.create", label: "New objective", group: "Managers", at: { page: "root", press: "new" }, fields: ["objective"], juno: "ask", keys: "M", go: "setup" },
  { id: "manager.pause", label: "Pause a manager", group: "Managers", at: { page: "m-coding-settings", press: "pause" }, fields: ["manager"], juno: "ask", go: "soon-Pause" },
  { id: "manager.try", label: "Try a change on past work", group: "Managers", at: { page: "m-support-settings", press: "try" }, fields: ["manager", "change"], juno: "on", go: "soon-Try a change" },
  { id: "chat.new", label: "New chat with Juno", group: "Chats", at: { page: "home", press: "new" }, fields: [], juno: "off", keys: "N", go: "home" },
  { id: "chat.fork", label: "Fork this chat", group: "Chats", at: { page: "chat-support", press: "fork" }, fields: ["message"], juno: "on", go: "chat-support-october" },
  { id: "work.add", label: "Add a piece of work", group: "Work", at: { page: "m-coding-board", press: "add" }, fields: ["title", "done when"], juno: "on", keys: "W", go: "m-coding-board" },
  { id: "work.approve", label: "Approve what waits for you", group: "Work", at: { page: "inbox", press: "approve" }, fields: [], juno: "off", go: "inbox" },
  { id: "trigger.add", label: "Add a trigger", group: "Managers", at: { page: "m-sales-playbook-triggers", press: "add" }, fields: ["what", "when"], juno: "ask", keys: "R", go: "m-sales-playbook-triggers" },
  { id: "connector.connect", label: "Connect something", group: "Connectors", at: { page: "set-connectors", press: "connect" }, fields: ["connector"], juno: "ask", go: "set-connectors" },
  { id: "juno.soul", label: "Change how Juno speaks", group: "Settings", at: { page: "juno-talking", press: "edit" }, fields: ["who", "how"], juno: "ask", go: "juno-talking" },
  { id: "person.invite", label: "Invite someone", group: "Settings", at: { page: "set-members", press: "invite" }, fields: ["mail", "role"], juno: "ask", go: "set-members" },
];
