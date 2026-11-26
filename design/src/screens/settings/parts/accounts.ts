/* Every connector of the workspace and its accounts. Names agree with MANAGERS in world.ts. Plain data: the app gets the same shape from its API. */
export type Link = "ok" | "offline";
export interface Account extends Record<string, unknown> {
  id: string; name: string; on: string; heldBy: string; usedBy: readonly string[]; link: Link; state: string; last: string;
  /** What it may do there, and what it asks first. */
  may: string; asks: string;
}
export interface Connector { id: string; name: string; what: string; accounts: readonly Account[] }

export const CONNECTORS: readonly Connector[] = [
  { id: "github", name: "GitHub", what: "Issues and pull requests", accounts: [
    { id: "gh-acme", name: "Acme’s GitHub App", on: "acme/web, acme/docs", heldBy: "Ama Mensah", usedBy: ["Coding", "Docs", "Releases"], link: "ok", state: "Connected", last: "09:54",
      may: "Read, comment, reply on lines, push to its own branches, open pull requests", asks: "Run checks again, merge, close an issue" },
  ] },
  { id: "email", name: "Email", what: "Mailboxes Juno writes from", accounts: [
    { id: "em-juno", name: "juno@acme.co-worker.tech", on: "Acme’s domain", heldBy: "Juno", usedBy: ["Sales", "Releases"], link: "ok", state: "Connected", last: "09:31",
      may: "Search, draft, reply, send to people inside Acme", asks: "Write first to someone outside" },
    { id: "em-support", name: "support@acme.example", on: "Acme’s domain", heldBy: "Juno", usedBy: ["Support"], link: "ok", state: "Connected", last: "09:40",
      may: "Search, draft, reply, send to people inside Acme", asks: "Write first to someone outside" },
  ] },
  { id: "slack", name: "Slack", what: "Where the team asks", accounts: [
    { id: "sl-acme", name: "acme.slack.com", on: "#engineering, #support-bugs, #releases, #sales", heldBy: "Ama Mensah", usedBy: ["Coding", "Sales"], link: "ok", state: "Connected", last: "09:36",
      may: "Answer where it is asked, in a thread", asks: "Write in a channel on its own" },
  ] },
  { id: "whatsapp", name: "WhatsApp", what: "Numbers customers write to", accounts: [
    { id: "wa-1", name: "+44 7700 900123", on: "Chats it started or that wrote to it, on Ama’s phone", heldBy: "Ama Mensah", usedBy: ["WhatsApp desk", "Support"], link: "offline", state: "Offline since 08:10", last: "08:09",
      may: "Read a chat, reply, react", asks: "Write first to someone new" },
  ] },
  { id: "crm", name: "CRM", what: "Deals and people", accounts: [
    { id: "crm-acme", name: "Acme’s CRM", on: "All deals", heldBy: "Bo Larsen", usedBy: ["Sales"], link: "ok", state: "Connected", last: "09:12",
      may: "Read deals, add a lead, add a note", asks: "Change a deal’s stage. “Fits” is set by Bo only" },
  ] },
  { id: "calendar", name: "Calendar", what: "Times for calls", accounts: [
    { id: "cal-bo", name: "Bo’s calendar", on: "Calls with leads", heldBy: "Bo Larsen", usedBy: ["Sales"], link: "ok", state: "Connected", last: "Yesterday",
      may: "Find a time, book, move", asks: "Cancel a call" },
  ] },
];
export const COUNT = CONNECTORS.reduce((n, c) => n + c.accounts.length, 0);
