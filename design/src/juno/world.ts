/* The co-worker itself: one name, one set of addresses, one way of talking. Managers are how it splits the work inside. */

export const JUNO = {
  name: "Juno", role: "Acme’s co-worker", since: "14 Sep",
  mail: "juno@acme.co-worker.tech", phone: "+44 7700 900123", slack: "@juno in acme.slack.com", github: "juno-acme[bot]",
} as const;

/** A chat with Juno. A fork of a chat is a chat of its own, under the one it was forked from. */
export interface Chat { readonly id: string; readonly title: string; readonly who: string; readonly where: string; readonly last: string; readonly state: "working" | "waiting" | "quiet"; readonly for?: string; readonly knew?: number; readonly forks?: readonly Chat[] }
export const CHATS: readonly Chat[] = [
  { id: "setup", title: "More good calls", who: "Ama Mensah", where: "Here", last: "5 Oct", state: "quiet" },
  { id: "chat-support", title: "Why is Support slower?", who: "Ama Mensah", where: "Here", last: "09:31", state: "quiet", forks: [
    { id: "chat-support-october", title: "Compare with October", who: "Ama Mensah", where: "Here", last: "09:46", state: "working", knew: 6 },
    { id: "soon-Chat", title: "Draft the note to the team", who: "Ama Mensah", where: "Here", last: "09:20", state: "quiet", knew: 2 },
  ] },
  { id: "soon-Chat", title: "v2.3 without the 150k fix", who: "Bo Larsen", where: "Slack, #releases", last: "09:05", state: "waiting", for: "Bo", forks: [
    { id: "soon-Chat", title: "What customers were told", who: "Bo Larsen", where: "Slack, #releases", last: "08:52", state: "quiet", knew: 11 },
  ] },
  { id: "soon-Chat", title: "Monday export is short", who: "Pat Reyes, Northwind", where: "Mail", last: "Yesterday", state: "waiting", for: "Ama" },
  { id: "soon-Chat", title: "Review of #418", who: "Chidi Okafor", where: "GitHub, acme/web #418", last: "09:54", state: "working" },
  { id: "soon-Chat", title: "Is my order on its way?", who: "Lena Fischer", where: "WhatsApp", last: "08:02", state: "quiet" },
];
/** The viewer's own, for the sidebar. The rest is under All chats. */
export const MINE = CHATS.filter((c) => c.who === "Ama Mensah");

export const SOUL = `I am Juno. I work for Acme, and I say so when someone asks.

I would rather say "I don't know yet" than guess. I write short, and I lead with the answer. I never pretend to be a person.

When two people want different things, I do neither: I tell both, and ask the one who answers for it.

I keep what people tell me in private, private. I don't repeat one customer's business to another.`;

/** How Juno speaks to whom, in plain sentences it follows. */
export const RULES = [
  { who: "You and the team", how: "Short, first names, no greeting. Say what you need at the top.", may: "Ask for anything. Changing a manager needs a Builder.", sign: "Juno" },
  { who: "Customers", how: "Polite, in their language, no inside words. Never promise a date a person has not given.", may: "Ask about their own account. Nothing about another customer.", sign: "Juno, Acme" },
  { who: "New leads", how: "One mail, one question. At most two reminders, three days apart.", may: "Ask about prices that are on the site.", sign: "Juno, for Bo Larsen" },
  { who: "Anyone else", how: "Say who you are, take a message, promise nothing.", may: "Leave a message.", sign: "Juno, Acme" },
] as const;

/** What makes something come in, for all managers together. `of`: whose playbook has it. */
export interface TriggerLine { readonly id: string; readonly name: string; readonly by: "Cron" | "Event" | "Wait"; readonly when: string; readonly next: string; readonly last: string; readonly lastState: "done" | "asked" | "failed"; readonly of: string; readonly on: boolean; readonly to: string }
export const TRIGGERS: readonly TriggerLine[] = [
  { id: "t1", name: "Say what needs a person today", by: "Cron", when: "Weekdays, 08:30", next: "Tomorrow, 08:30", last: "Today, 3 things", lastState: "done", of: "Juno", on: true, to: "soon-Trigger" },
  { id: "t2", name: "Look at every manager’s week", by: "Cron", when: "Mondays, 07:00", next: "Mon, 07:00", last: "23 Nov, 1 change tried", lastState: "done", of: "Juno", on: true, to: "soon-Trigger" },
  { id: "t3", name: "An issue on acme/web", by: "Event", when: "As it happens", next: "", last: "09:30, 1 taken on", lastState: "done", of: "Coding", on: true, to: "soon-Trigger" },
  { id: "t4", name: "Cut a release", by: "Cron", when: "Every second Thursday, 14:00", next: "Tomorrow, 14:00", last: "Today, asks Bo", lastState: "asked", of: "Releases", on: true, to: "soon-Trigger" },
  { id: "t5", name: "Does the WhatsApp number answer?", by: "Cron", when: "Every 10 minutes", next: "10:00", last: "09:50, no answer", lastState: "failed", of: "WhatsApp desk", on: true, to: "soon-Trigger" },
  { id: "t6", name: "Look for signs", by: "Cron", when: "Weekdays, 08:30", next: "Tomorrow, 08:30", last: "Today, 1 found", lastState: "done", of: "Sales", on: true, to: "m-sales-search" },
  { id: "t7", name: "No answer for three days", by: "Wait", when: "72 hours", next: "", last: "08:00, 1 reminder", lastState: "done", of: "Sales", on: true, to: "m-sales-playbook-triggers" },
  { id: "t8", name: "Clear out memory nobody used", by: "Cron", when: "First of the month", next: "Off", last: "1 Nov, 41 notes", lastState: "done", of: "Juno", on: false, to: "soon-Trigger" },
];
