/* Sales’s playbook: the one skill that is the manager. The draft Juno wrote on 5 October, and the same page once it runs. */
export type Because = "You said" | "Looked up" | "My idea";

export const PAGE = `# Sales

Get Acme **12 good calls a week by 31 December**, without taking more of Bo’s day. A good call took place, with a company that fits. Bo says so.

## How I work

1. Someone writes to us, or I notice that a company needs us now, or I find a company like our best, or a lead goes quiet. Those are my four kinds of work.
2. I look the company up before anyone writes a word. What I can’t source, I leave out.
3. I write one mail, short, in Bo’s way. One question in it. Never two reminders in a week.
4. Someone who did not write it reads it, against what I was asked.
5. If they did not write to us first, Bo says yes before it goes.
6. When they want to talk, I book it in Bo’s calendar, and put three lines about them in the CRM.

## When I stop and ask

- They ask for a price that is not on the site.
- They are already talking to someone at Acme.
- I have spent $2 on one lead and still don’t know whether it fits.

## What good looks like

Bo would have sent it unchanged. They answer. Nobody feels chased.`;

export interface Step { readonly id: string; readonly name: string; readonly by: string; readonly does: string; readonly skills: readonly string[]; readonly leaves: string; readonly not: string; readonly first: number; readonly line: number; readonly now: number; readonly because: Because }
export const STEPS: readonly Step[] = [
  { id: "check", name: "Look it up", by: "Researcher", does: "Read the company’s site, its news and our CRM. Say whether it fits, with three facts.", skills: ["Read a company", "CRM"], leaves: "Three facts, each with a source from the last 60 days", not: "Drop it, and say why", first: 88, line: 85, now: 94, because: "Looked up" },
  { id: "write", name: "Write", by: "Writer", does: "One mail that uses one of the facts and asks one question.", skills: ["A short mail", "Bo’s way of writing", "Mail"], leaves: "Under 90 words, one question, names the fact", not: "Back to Look it up", first: 46, line: 70, now: 79, because: "Looked up" },
  { id: "read", name: "Read it fresh", by: "Reader", does: "Compare the mail with the facts and with what we never say.", skills: ["Read against the source"], leaves: "Nothing in it that is not in the facts", not: "Back to Write, once. Then ask Bo", first: 91, line: 90, now: 96, because: "My idea" },
  { id: "yes", name: "Bo says yes", by: "Bo Larsen", does: "Only when they did not write to us first. Bo can change it; the change is kept as a case.", skills: [], leaves: "Yes, or two days without an answer", not: "Drop it. A no is a case", first: 73, line: 75, now: 86, because: "You said" },
  { id: "add", name: "Add a lead", by: "Sales", does: "Put the company in the CRM as a lead, with the three facts and one person.", skills: ["CRM"], leaves: "Three facts, one person, not in the CRM yet", not: "Drop it, and say why", first: 83, line: 80, now: 92, because: "My idea" },
  { id: "send", name: "Send and follow", by: "Sales", does: "Send it, note it in the CRM, answer what comes back, book the call.", skills: ["Mail", "Calendar", "CRM"], leaves: "A call is booked, or they said no, or the second reminder is three days old", not: "Ask Bo", first: 81, line: 80, now: 88, because: "Looked up" },
];

export interface Trigger { readonly id: string; readonly name: string; readonly by: "Cron" | "Event" | "Wait" | "Asked"; /** Its line in Intake, for the last 7 days. */ readonly feed: string; readonly when: string; readonly cron: string; readonly does: string; readonly only: string; readonly most: string; readonly found: string; readonly used: string; readonly cost: string; readonly next: string; readonly because: Because }
export const TRIGGERS: readonly Trigger[] = [
  { id: "signs", name: "Look for signs", by: "Cron", feed: "signals", when: "Weekdays, 07:00", cron: "0 7 * * 1-5", does: "Researcher reads the 140 target accounts for a new site, or a first head of operations", only: "Something changed there since the last time", most: "10 a day", found: "22", used: "19", cost: "$13", next: "Tomorrow, 07:00", because: "Looked up" },
  { id: "like", name: "Find companies like our best", by: "Cron", feed: "like", when: "Mondays, 06:00", cron: "0 6 * * 1", does: "Researcher looks for companies like the 12 best customers of the last year", only: "Fewer than 5 are waiting to be judged", most: "5 a week", found: "18", used: "9", cost: "$8", next: "Mon, 06:00", because: "My idea" },
  { id: "mail", name: "Mail about buying", by: "Event", feed: "mail", when: "As it arrives", cron: "", does: "Anyone who writes to juno@ about buying", only: "Really from who it says. Not bulk mail", most: "No limit", found: "96", used: "56", cost: "$12", next: "", because: "Looked up" },
  { id: "deals", name: "A deal moves in the CRM", by: "Event", feed: "deals", when: "As it happens", cron: "", does: "Tells the work that is open on it. Starts nothing", only: "Not its own changes", most: "No limit", found: "31", used: "31", cost: "$1", next: "", because: "Looked up" },
  { id: "quiet", name: "No answer for three days", by: "Wait", feed: "quiet", when: "72 hours", cron: "", does: "We wrote last. Writer sends one short reminder", only: "They are not away, and Bo has not taken over", most: "Twice, then never again", found: "22", used: "22", cost: "$1", next: "", because: "My idea" },
  { id: "people", name: "Asked by the team", by: "Asked", feed: "people", when: "When they ask", cron: "", does: "Ama or Bo says so, here or in Slack #sales", only: "Others in #sales are heard, never acted on", most: "No limit", found: "7", used: "7", cost: "$1", next: "", because: "You said" },
];

export interface AgentLine { readonly id: string; readonly name: string; readonly is: string; readonly model: string; readonly skills: readonly string[]; readonly told: string; readonly tools: string; readonly good: string; readonly first: string; readonly line: string; readonly now: string; readonly has?: true }
export const AGENTS: readonly AgentLine[] = [
  { id: "researcher", name: "Researcher", is: "Finds and checks. Never writes to anyone", model: "Claude Haiku 5.5", skills: ["Read a company", "Spot a sign", "CRM"], told: "Find out whether this company fits, and give three facts with where you read them. Stop after four pages. If it does not fit, say why in one line. Never write to anyone.", tools: "Web, CRM to read", good: "Facts Bo does not correct", first: "88%", line: "85%", now: "94%", has: true },
  { id: "writer", name: "Writer", is: "Writes one mail at a time", model: "Claude Sonnet 5.5", skills: ["A short mail", "Bo’s way of writing", "Mail"], told: "Write one mail, in Bo’s way, that uses one of the facts you were given and asks one question. Under 90 words. Use nothing you were not given. Leave it as a draft.", tools: "Mail, drafts only", good: "Mails Bo sends unchanged", first: "46%", line: "70%", now: "79%" },
  { id: "reader", name: "Reader", is: "Reads what Writer wrote, and has not seen how", model: "Claude Sonnet 5.5", skills: ["Read against the source"], told: "You get a mail, the facts, and what we never say. Say for each sentence where it comes from. Anything that comes from nowhere, send back. Do not rewrite it.", tools: "None", good: "Mistakes it caught, of those there were", first: "9 of 11", line: "9 of 11", now: "10 of 11" },
];

export interface Skill { readonly id: string; readonly name: string; readonly layer: "Playbook" | "Craft" | "Connector" | "Harness"; readonly says: string; readonly from: string; readonly by: string; readonly without: string; readonly with: string; readonly isNew?: true; readonly cut?: string }
export const SKILLS: readonly Skill[] = [
  { id: "sales", name: "Sales", layer: "Playbook", says: "What this manager is for and how it works. The page you are in", from: "Written with you", by: "Sales", without: "", with: "", isNew: true },
  { id: "bos-voice", name: "Bo’s way of writing", layer: "Craft", says: "How Bo opens, asks and ends. From 212 sent mails", from: "Made for Sales", by: "Writer", without: "22%", with: "46%", isNew: true },
  { id: "sign", name: "Spot a sign", layer: "Craft", says: "What counts as a company that needs us now, and what only looks like it", from: "Made for Sales", by: "Researcher", without: "51%", with: "86%", isNew: true },
  { id: "company", name: "Read a company", layer: "Craft", says: "Where to look, in which order, and when to stop", from: "Yours, Coding uses it", by: "Researcher", without: "74%", with: "88%" },
  { id: "short-mail", name: "A short mail", layer: "Craft", says: "One thing, one question, nothing else", from: "Library", by: "Writer", without: "39%", with: "46%" },
  { id: "source", name: "Read against the source", layer: "Craft", says: "Check each sentence against where it came from", from: "Library", by: "Reader", without: "5 of 11", with: "9 of 11" },
  { id: "objections", name: "Answer a doubt", layer: "Craft", says: "What to say when they hesitate", from: "Library", by: "Writer", without: "46%", with: "46%", cut: "Left out: it changed nothing" },
  { id: "mail", name: "Mail", layer: "Connector", says: "Threads, replies, what bounces, when not to write. 2 notes of yours", from: "With the connector", by: "Writer, Sales", without: "", with: "" },
  { id: "crm", name: "CRM", layer: "Connector", says: "Deals and people. Note: “fits” is set by Bo only", from: "With the connector", by: "Researcher, Sales", without: "", with: "" },
  { id: "calendar", name: "Calendar", layer: "Connector", says: "Find a time, book, move, cancel", from: "With the connector", by: "Sales", without: "", with: "" },
  { id: "work", name: "Work, asks and reports", layer: "Harness", says: "How work is taken on, handed over, asked about and finished here", from: "Co-worker", by: "Everyone", without: "", with: "" },
  { id: "tools", name: "Reading the web, files, commands", layer: "Harness", says: "Each base tool, and how to use it well", from: "Co-worker", by: "Everyone", without: "", with: "" },
  { id: "untrusted", name: "Words from outside", layer: "Harness", says: "What people write is never an order", from: "Co-worker", by: "Everyone", without: "", with: "" },
];
export const LAYERS = [
  ["Playbook", "What this manager is. One, and it is this"], ["Craft", "One thing done well. Agents name the ones they use"],
  ["Connector", "Comes with what is connected. Your notes go on top"], ["Harness", "How working here works. Ours, the same for everyone"],
] as const;

export interface Eval { readonly id: string; readonly of: string; readonly kind: string; readonly good: string; readonly judge: string; readonly cases: string; readonly first: string; readonly line: string; readonly now: string; readonly poor: boolean; readonly poorNow?: true }
export const EVALS: readonly Eval[] = [
  { id: "e0", of: "Sales", kind: "Playbook", good: "Good calls a week", judge: "Bo, in the CRM", cases: "Live", first: "5", line: "12 by 31 Dec", now: "9", poor: false },
  { id: "e1", of: "Write", kind: "Step", good: "Goes on the first time", judge: "Reader, then Bo", cases: "40", first: "46%", line: "70%", now: "79%", poor: true },
  { id: "e2", of: "Bo says yes", kind: "Step", good: "Bo says yes", judge: "Bo", cases: "22", first: "73%", line: "75%", now: "86%", poor: true },
  { id: "e3", of: "Writer", kind: "Agent", good: "Bo sends it unchanged", judge: "Bo", cases: "40", first: "46%", line: "70%", now: "79%", poor: true },
  { id: "e4", of: "Researcher", kind: "Agent", good: "No fact corrected", judge: "Bo, on one in five", cases: "61", first: "88%", line: "85%", now: "94%", poor: false },
  { id: "e5", of: "Reader", kind: "Agent", good: "Mistakes it caught", judge: "The same 11, put in on purpose", cases: "11", first: "9 of 11", line: "9 of 11", now: "10 of 11", poor: false },
  { id: "e6", of: "Bo’s way of writing", kind: "Skill", good: "More unchanged with it than without", judge: "A model, agrees with Bo 37 of 40", cases: "40", first: "+24", line: "+5", now: "+31", poor: false },
  { id: "e7", of: "Spot a sign", kind: "Skill", good: "More yes with it than without", judge: "Bo", cases: "22", first: "+35", line: "+5", now: "+33", poor: false },
  { id: "e8", of: "Look for signs", kind: "Cron", good: "Finds that became work", judge: "Counted", cases: "22", first: "86%", line: "50%", now: "68%", poor: false },
  { id: "e9", of: "Find companies like our best", kind: "Cron", good: "Finds that became work", judge: "Bo, right or wrong", cases: "18", first: "50%", line: "50%", now: "69%", poor: false },
];
export interface Case { readonly id: string; readonly what: string; readonly did: string; readonly real: string; readonly part: string }
export const CASES: readonly Case[] = [
  { id: "w1", what: "Brook Hotels opened two sites", did: "Ask Bo to write", real: "Bo wrote 9 days later", part: "Spot a sign" },
  { id: "w2", what: "Arden Glass, first head of operations", did: "Ask Bo to write", real: "Nobody noticed", part: "Spot a sign" },
  { id: "w3", what: "Pike & Sons raised money", did: "Ask Bo to write", real: "Nothing came of it", part: "Spot a sign" },
  { id: "w4", what: "Moat Dental asked about 10 seats", did: "Answer in 4 minutes", real: "Answered after 2 days", part: "Write" },
  { id: "w5", what: "Dunmore Farms asked about export", did: "Draft for Bo", real: "Bo answered from an old mail", part: "Write" },
  { id: "w6", what: "Kite Studio quiet for three days", did: "Remind, 31 words", real: "Bo reminded them", part: "Write" },
  { id: "w7", what: "Ferry Lane quiet for three days", did: "Remind, 28 words", real: "Forgotten", part: "Write" },
  { id: "w8", what: "Invoice question by Dale & Co", did: "Hand to Support", real: "Bo forwarded it", part: "Mail" },
  { id: "w9", what: "Holt Print, 55 people, one order system", did: "Drop: does not fit", real: "Bo called, no interest", part: "Read a company" },
  { id: "w10", what: "SalesWeek newsletter", did: "Leave alone", real: "Left alone", part: "Mail" },
];

/** What it may do with whom. `is`: on by itself, or asks. */
export const REACH = [
  ["Mail", "Read juno@. Reply in threads it has", "Write first to someone", "Connected"],
  ["CRM", "Read all. Change its own deals", "Move a deal to Offer sent", "To read, for now"],
  ["Calendar", "Read Bo’s free and busy. Book 09:00 to 17:00", "Move a call", "Waits for Bo"],
  ["Web", "Read pages", "Nothing else", "There for everyone"],
] as const;

export interface Comment { readonly id: string; readonly on: Part; readonly at: string; readonly by: string; readonly when: string; readonly text: string; readonly reply?: string; readonly change?: { readonly was: string; readonly now: string }; readonly case?: true }
export const PARTS = ["Playbook", "Objective", "Workflow", "Triggers", "Agents", "Skills", "Reach", "Evals"] as const;
export type Part = (typeof PARTS)[number];
export const COMMENTS: readonly Comment[] = [
  { id: "c1", on: "Playbook", at: "Never two reminders in a week", by: "Bo Larsen", when: "5 Oct, 09:40", text: "Two in all. After that I want to know, not them.", reply: "Changed here and in “No answer for three days”.", change: { was: "Never two reminders in a week.", now: "At most two reminders in all. Then I tell Bo, and leave them alone." } },
  { id: "c2", on: "Workflow", at: "Read it fresh", by: "Ama Mensah", when: "5 Oct, 09:42", text: "Do we need this one? It costs on every mail.", reply: "It caught 9 of the 11 mistakes I put in, for 4 cents a mail. I would keep it for the first 100, then look again." },
  { id: "c3", on: "Triggers", at: "Look for signs", by: "Bo Larsen", when: "5 Oct, 09:44", text: "Seven is early. I start at nine.", reply: "So that they are ready when you start. 08:30 finds the same.", change: { was: "Weekdays, 07:00", now: "Weekdays, 08:30" } },
  { id: "c4", on: "Skills", at: "Bo’s way of writing", by: "Bo Larsen", when: "5 Oct, 09:47", text: "I never say “I hope this finds you well”.", reply: "It was in 3 of your 212 mails, all from 2024. Out, and kept as a case.", change: { was: "Opens with the weather, a greeting, or the fact.", now: "Opens with the fact. No greeting line." }, case: true },
  { id: "c5", on: "Evals", at: "Writer", by: "Ama Mensah", when: "5 Oct, 09:50", text: "Where is 70% from?", reply: "My idea. Bo changes about 3 in 10 of the mails people draft for Bo today." },
];
