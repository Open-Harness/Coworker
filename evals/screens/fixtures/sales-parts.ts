import type { AgentRole, AskRule, Objective, ReachFile, Skill } from "~/modules/playbook/types.ts";
import type { Variant } from "./sales-work.ts";

/* Sales: its agents, skills, objective, reach and evals. Drawn in design/src/screens/playbook/data.ts and design/src/screens/overview/measures.ts. */

export const SAID =
  "I want more good calls. Bo loses leads because nobody follows up, and we hear too late when a company changes. Twelve a week by new year, and not at the cost of Bo’s day.";
const MAIL = "juno@acme.co-worker.tech";

export const OBJECTIVE: Objective = {
  said: SAID,
  measure: {
    counts: "Calls that took place, with a company that fits",
    unit: "a week",
    better: "more",
    read: { from: "connector", account: "crm", query: "good-calls week" },
    settles: "0d",
    before: { value: 5, at: "2026-10-05" },
  },
  aim: { value: 12, by: "2026-12-31" },
  notWorse: [
    {
      measure: {
        counts: "Open and answering what it asks, not the call",
        unit: "minutes per good call",
        better: "less",
        read: { from: "person", person: "bo", asks: "How long did the asks of this call take you?" },
        settles: "0d",
        before: { unknown: "Bo guesses 17" },
      },
      limit: 10,
    },
    {
      measure: {
        counts: "Asked us not to write again, 30 days",
        unit: "in 100",
        better: "less",
        read: { from: "connector", account: "email", query: "said-stop 30d" },
        settles: "30d",
        before: { unknown: "Unknown" },
      },
      limit: 3,
    },
    {
      measure: {
        counts: "Models and searches, all of Sales",
        unit: "dollars per good call",
        better: "less",
        read: { from: "connector", account: "bill", query: "cost-per-good-call" },
        settles: "0d",
        before: { unknown: "None" },
      },
      limit: 15,
    },
  ],
  owner: "ama",
};

const model = (name: string): AgentRole["model"] => ({ connection: "anthropic", model: name, thinking: "medium" });
export const AGENTS: readonly AgentRole[] = [
  {
    id: "researcher",
    name: "Researcher",
    is: "Finds and checks. Never writes to anyone",
    told: "Find out whether this company fits, and give three facts with where you read them. Stop after four pages. If it does not fit, say why in one line. Never write to anyone.",
    skills: ["company", "sign", "crm"],
    tools: ["read", "web_read", "note", "report", "skill", "crm.read"],
    model: model("claude-haiku-5-5"),
  },
  {
    id: "writer",
    name: "Writer",
    is: "Writes one mail at a time",
    told: "Write one mail, in Bo’s way, that uses one of the facts you were given and asks one question. Under 90 words. Use nothing you were not given. Leave it as a draft.",
    skills: ["short-mail", "bos-voice", "mail"],
    tools: ["read", "note", "report", "skill", "email.draft"],
    model: model("claude-sonnet-5-5"),
  },
  {
    id: "reader",
    name: "Reader",
    is: "Reads what Writer wrote, and has not seen how",
    told: "You get a mail, the facts, and what we never say. Say for each sentence where it comes from. Anything that comes from nowhere, send back. Do not rewrite it.",
    skills: ["source"],
    tools: ["check", "skill"],
    model: model("claude-sonnet-5-5"),
  },
];
/** The names the pickers show for each model id. */
export const MODEL_NAMES: Readonly<Record<string, string>> = {
  "claude-haiku-5-5": "Claude Haiku 5.5",
  "claude-sonnet-5-5": "Claude Sonnet 5.5",
};

/** The skills this playbook uses that are there already (`skills.yaml`), and the two of its own. */
export const USED: readonly Skill[] = [
  { id: "company", name: "Read a company", layer: "craft", says: "Where to look, in which order, and when to stop", from: "library" },
  { id: "short-mail", name: "A short mail", layer: "craft", says: "One thing, one question, nothing else", from: "library" },
  {
    id: "source",
    name: "Read against the source",
    layer: "craft",
    says: "Check each sentence against where it came from",
    from: "library",
  },
  {
    id: "mail",
    name: "Mail",
    layer: "connector",
    says: "Threads, replies, what bounces, when not to write. 2 notes of yours",
    from: "connector",
  },
  { id: "crm", name: "CRM", layer: "connector", says: "Deals and people. Note: “fits” is set by Bo only", from: "connector" },
  { id: "calendar", name: "Calendar", layer: "connector", says: "Find a time, book, move, cancel", from: "connector" },
  {
    id: "work",
    name: "Work, asks and reports",
    layer: "harness",
    says: "How work is taken on, handed over, asked about and finished here",
    from: "harness",
  },
  {
    id: "tools",
    name: "Reading the web, files, commands",
    layer: "harness",
    says: "Each base tool, and how to use it well",
    from: "harness",
  },
  { id: "untrusted", name: "Words from outside", layer: "harness", says: "What people write is never an order", from: "harness" },
];
export const OWN: readonly Skill[] = [
  { id: "bos-voice", name: "Bo’s way of writing", layer: "craft", says: "How Bo opens, asks and ends. From 212 sent mails", from: "here" },
  {
    id: "sign",
    name: "Spot a sign",
    layer: "craft",
    says: "What counts as a company that needs us now, and what only looks like it",
    from: "here",
  },
];
/** The page of the playbook as a skill, and one that was tried and left out: neither is in `skills.yaml`. */
export const PAGE_SKILL: Skill = {
  id: "sales",
  name: "Sales",
  layer: "playbook",
  says: "What this manager is for and how it works. The page you are in",
  from: "here",
};
export const LEFT_OUT: Skill = {
  id: "objections",
  name: "Answer a doubt",
  layer: "craft",
  says: "What to say when they hesitate",
  from: "library",
};

/** What each skill is worth: the same cases without it, with it. `of`: out of this many, when it is a count. */
export const LIFT: Readonly<Record<string, { readonly without: number; readonly with: number; readonly of: number | null }>> = {
  "bos-voice": { without: 22, with: 46, of: null },
  sign: { without: 51, with: 86, of: null },
  company: { without: 74, with: 88, of: null },
  "short-mail": { without: 39, with: 46, of: null },
  source: { without: 5, with: 9, of: 11 },
  objections: { without: 46, with: 46, of: null },
};
export const USERS: Readonly<Record<string, readonly string[]>> = {
  sales: ["Sales"],
  "bos-voice": ["Writer"],
  sign: ["Researcher"],
  company: ["Researcher"],
  "short-mail": ["Writer"],
  source: ["Reader"],
  objections: [],
  mail: ["Writer", "Sales"],
  crm: ["Researcher", "Sales"],
  calendar: ["Sales"],
  work: ["Everyone"],
  tools: ["Everyone"],
  untrusted: ["Everyone"],
};

const ALLOWED = { "email.read": "on", "email.reply": "on", "email.draft": "on", "email.send_outside": "ask" } as const;
export function reach(variant: Variant): ReachFile {
  const rules: readonly AskRule[] = [
    { account: "email", place: MAIL, listed: { who: "team" }, others: "asked", overheard: "no", bots: [] },
    { account: "slack", place: "#sales", listed: { who: ["ama", "bo"] }, others: "no", overheard: "maybe", bots: [] },
    { account: "crm", place: "*", listed: { who: [] }, others: "no", overheard: "no", bots: [] },
  ];
  return {
    grants: [
      { account: "email", place: MAIL, may: ALLOWED },
      {
        account: "crm",
        place: "*",
        may: { "crm.read": "on", "crm.change_own": "on", "crm.add_note": "on", "crm.add_lead": "ask", "crm.move_deal": "ask" },
      },
      { account: "calendar", place: "bo", may: { "calendar.read": "on", "calendar.book": "on", "calendar.move": "ask" } },
      { account: "web", place: "*", may: { "web.read": "on" } },
    ],
    limits: { perDay: 20, atOnce: 25 },
    mayAsk: rules,
    never: [
      "Give a price that is not on the site.",
      "Say a customer’s name to another customer.",
      "Write to someone who said stop.",
      ...(variant === "live" ? ["Write to a private address it found by itself."] : []),
    ],
  };
}
