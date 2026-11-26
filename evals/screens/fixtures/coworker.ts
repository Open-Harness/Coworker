import type { Talking } from "~/modules/coworker/types.ts";
import type { Trigger } from "~/modules/playbook/types.ts";
import type { CoworkerView } from "~/modules/views-workspace/types.ts";
import { SET_UP_FILES } from "./coworker-skill.ts";
import { CORRECTIONS, HISTORY, MAY, MEMORY, SPENDING } from "./coworker-memory.ts";
import { at, read, type Fixture } from "./read.ts";
import { JUNO } from "./workspace-shell.ts";

const SOUL = `I am Juno. I work for Acme, and I say so when someone asks.

I would rather say "I don't know yet" than guess. I write short, and I lead with the answer. I never pretend to be a person.

When two people want different things, I do neither: I tell both, and ask the one who answers for it.

I keep what people tell me in private, private. I don't repeat one customer's business to another.`;

const talk = (id: string, who: string, is: Talking["is"], how: string, may: string, sign: string): Talking => ({
  id,
  who,
  is,
  how,
  may,
  sign,
});
const TALKING: readonly Talking[] = [
  talk(
    "team",
    "You and the team",
    { people: "team" },
    "Short, first names, no greeting. Say what you need at the top.",
    "Ask for anything. Changing a manager needs a Builder.",
    "Juno",
  ),
  talk(
    "customers",
    "Customers",
    { people: "customers" },
    "Polite, in their language, no inside words. Never promise a date a person has not given.",
    "Ask about their own account. Nothing about another customer.",
    "Juno, Acme",
  ),
  talk(
    "leads",
    "New leads",
    { people: "leads" },
    "One mail, one question. At most two reminders, three days apart.",
    "Ask about prices that are on the site.",
    "Juno, for Bo Larsen",
  ),
  talk(
    "anyone",
    "Anyone else",
    { people: "anyone" },
    "Say who you are, take a message, promise nothing.",
    "Leave a message.",
    "Juno, Acme",
  ),
];

const zone = "Europe/Copenhagen";
const base = { on: true, makes: "tells", only: "", atMost: "no limit" } as const;
const cron = (id: string, name: string, expression: string, agent: string): Trigger => ({
  ...base,
  id,
  name,
  by: "cron",
  when: { cron: expression, zone },
  agent,
  brief: name,
  finds: [],
  same: [],
});
const TRIGGERS: CoworkerView["triggers"] = [
  {
    trigger: cron("t1", "Say what needs a person today", "30 8 * * 1-5", "root"),
    of: "root",
    next: at("26 Nov 08:30"),
    last: { at: at("25 Nov 08:30"), says: "3 things", is: "done" },
  },
  {
    trigger: cron("t2", "Look at every manager’s week", "0 7 * * 1", "root"),
    of: "root",
    next: at("30 Nov 07:00"),
    last: { at: at("23 Nov 07:00"), says: "1 change tried", is: "done" },
  },
  {
    trigger: {
      ...base,
      id: "t3",
      name: "An issue on acme/web",
      by: "event",
      account: "github",
      place: "acme/web",
      events: ["issues.opened"],
    },
    of: "coding",
    next: null,
    last: { at: at("25 Nov 09:30"), says: "1 taken on", is: "done" },
  },
  {
    trigger: cron("t4", "Cut a release", "0 14 * * 4", "releases"),
    of: "releases",
    next: at("26 Nov 14:00"),
    last: { at: at("25 Nov 09:05"), says: "asks Bo", is: "asked" },
  },
  {
    trigger: cron("t5", "Does the WhatsApp number answer?", "*/10 * * * *", "whatsapp"),
    of: "whatsapp",
    next: at("25 Nov 10:00"),
    last: { at: at("25 Nov 09:50"), says: "no answer", is: "failed" },
  },
  {
    trigger: cron("t6", "Look for signs", "30 8 * * 1-5", "researcher"),
    of: "sales",
    next: at("26 Nov 08:30"),
    last: { at: at("25 Nov 08:30"), says: "1 found", is: "done" },
  },
  {
    trigger: {
      ...base,
      id: "t7",
      name: "No answer for three days",
      by: "wait",
      for: "72h",
      of: "mail",
      holds: "the lead",
      account: "email",
    },
    of: "sales",
    next: null,
    last: { at: at("25 Nov 08:00"), says: "1 reminder", is: "done" },
  },
  {
    trigger: { ...cron("t8", "Clear out memory nobody used", "0 6 1 * *", "root"), on: false },
    of: "root",
    next: null,
    last: { at: at("1 Nov 06:00"), says: "41 notes", is: "done" },
  },
];

export const COWORKER_VIEW: CoworkerView = {
  identity: JUNO,
  offline: [{ connector: "whatsapp", since: at("25 Nov 08:10") }],
  voice: "calm",
  aloud: false,
  soul: SOUL,
  never: ["Send money.", "Promise a date a person has not given.", "Say it is a person."],
  mayPropose: true,
  talking: TALKING,
  triggers: TRIGGERS,
  skills: [
    {
      id: "set-up-a-manager",
      name: "Set up a manager",
      layer: "harness",
      says: "From one sentence to a draft of everything",
      from: "harness",
    },
  ],
  setUp: {
    skill: "set-up-a-manager",
    version: 14,
    since: at("2 Oct 10:00"),
    unchanged: { now: 0.83, aim: 0.75 },
    noChange: { count: 2, of: 31, goneSince: 13 },
    trying: "Asking for call recordings only when there are more than 20",
    drafts: 6,
    files: SET_UP_FILES,
  },
  memory: MEMORY,
  corrections: CORRECTIONS,
  may: MAY,
  spending: SPENDING,
  history: HISTORY,
};

export const COWORKER: readonly Fixture[] = [read("/coworker", {}, COWORKER_VIEW)];
