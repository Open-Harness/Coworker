import type { Comment, JudgedCase } from "~/modules/views-manager/types.ts";
import { at } from "./read.ts";
import type { Variant } from "./sales-work.ts";
import { REMIND_AFTER, VOICE_AFTER, VOICE_BEFORE } from "./sales-text.ts";

/* What people and Juno said about the draft on 5 October, and about the playbook since. design/src/screens/playbook/data.ts and index.tsx. */

export const DRAFT_COMMENTS: readonly Comment[] = [
  {
    id: "c1",
    on: "page/How I work",
    part: "Playbook",
    by: "Bo Larsen",
    at: at("5 Oct 09:40"),
    text: "Two in all. After that I want to know, not them.",
    quote: "Never two reminders in a week",
    became: {
      _tag: "Change",
      change: { line: "page/How I work", was: "Never two reminders in a week.", becomes: REMIND_AFTER },
      says: "Changed here and in “No answer for three days”.",
      is: "offered",
      case: null,
    },
  },
  {
    id: "c2",
    on: "workflow/signal/read",
    part: "Workflow",
    by: "Ama Mensah",
    at: at("5 Oct 09:42"),
    text: "Do we need this one? It costs on every mail.",
    quote: null,
    became: {
      _tag: "Answer",
      text: "It caught 9 of the 11 mistakes I put in, for 4 cents a mail. I would keep it for the first 100, then look again.",
    },
  },
  {
    id: "c3",
    on: "triggers/signs",
    part: "Triggers",
    by: "Bo Larsen",
    at: at("5 Oct 09:44"),
    text: "Seven is early. I start at nine.",
    quote: null,
    became: {
      _tag: "Change",
      change: { line: "triggers/signs", was: "Weekdays, 07:00", becomes: "Weekdays, 08:30" },
      says: "So that they are ready when you start. 08:30 finds the same.",
      is: "offered",
      case: null,
    },
  },
  {
    id: "c4",
    on: "skills/bos-voice",
    part: "Skills",
    by: "Bo Larsen",
    at: at("5 Oct 09:47"),
    text: "I never say “I hope this finds you well”.",
    quote: null,
    became: {
      _tag: "Change",
      change: { line: "skills/bos-voice", was: VOICE_BEFORE, becomes: VOICE_AFTER },
      says: "It was in 3 of your 212 mails, all from 2024. Out, and kept as a case.",
      is: "offered",
      case: "voice-greeting",
    },
  },
  {
    id: "c5",
    on: "evals/writer",
    part: "Evals",
    by: "Ama Mensah",
    at: at("5 Oct 09:50"),
    text: "Where is 70% from?",
    quote: null,
    became: { _tag: "Answer", text: "My idea. Bo changes about 3 in 10 of the mails people draft for Bo today." },
  },
];

export const LIVE_COMMENTS: readonly Comment[] = [
  {
    id: "n1",
    on: "workflow/quiet",
    part: "Workflow",
    by: "Juno",
    at: at("23 Nov 09:00"),
    text: "It found nothing in the last 60 reminders. I would leave it out for reminders only: 4 cents and 20 seconds each. Tried on 60 past ones, the same mails went out.",
    quote: "Read it fresh",
    became: {
      _tag: "Change",
      change: {
        line: "workflow/quiet",
        was: "A lead that went quiet: Write, Read it fresh, Send",
        becomes: "A lead that went quiet: Write, Send",
      },
      says: "",
      is: "offered",
      case: null,
    },
  },
  {
    id: "n2",
    on: "skills/bos-voice",
    part: "Skills",
    by: "Bo Larsen",
    at: at("24 Nov 09:00"),
    text: "The mail to Arden Glass was too long. Two lines would do for someone I have met.",
    quote: null,
    became: {
      _tag: "Change",
      change: {
        line: "skills/bos-voice",
        was: "Bo writes longer to people Bo has met.",
        becomes: "To people Bo has met: two lines, no facts they know.",
      },
      says: "Kept as a case. Tried on the 9 mails to people you have met: 5 unchanged before, 8 now.",
      is: "offered",
      case: "voice-met",
    },
  },
  {
    id: "n3",
    on: "evals/signs",
    part: "Evals",
    by: "Juno",
    at: at("24 Nov 09:30"),
    text: "The weakest part this week: 68% of what it found became work. I tried one change on the same 28 past cases: it finds 22, all 19 that became work are among them (86%), and it leaves 6 that were only a new page. It changes what counts as a sign, so I ask.",
    quote: null,
    became: {
      _tag: "Change",
      change: { line: "triggers/signs", was: "A new site.", becomes: "A new site at its own address." },
      says: "",
      is: "offered",
      case: null,
    },
  },
];

type Case = readonly [id: string, what: string, would: string, happened: string, of: string];
const CASES: readonly Case[] = [
  ["w1", "Brook Hotels opened two sites", "Ask Bo to write", "Bo wrote 9 days later", "skills/sign"],
  ["w2", "Arden Glass, first head of operations", "Ask Bo to write", "Nobody noticed", "skills/sign"],
  ["w3", "Pike & Sons raised money", "Ask Bo to write", "Nothing came of it", "skills/sign"],
  ["w4", "Moat Dental asked about 10 seats", "Answer in 4 minutes", "Answered after 2 days", "workflow/signal/write"],
  ["w5", "Dunmore Farms asked about export", "Draft for Bo", "Bo answered from an old mail", "workflow/signal/write"],
  ["w6", "Kite Studio quiet for three days", "Remind, 31 words", "Bo reminded them", "workflow/signal/write"],
  ["w7", "Ferry Lane quiet for three days", "Remind, 28 words", "Forgotten", "workflow/signal/write"],
  ["w8", "Invoice question by Dale & Co", "Hand to Support", "Bo forwarded it", "skills/mail"],
  ["w9", "Holt Print, 55 people, one order system", "Drop: does not fit", "Bo called, no interest", "skills/company"],
  ["w10", "SalesWeek newsletter", "Leave alone", "Left alone", "skills/mail"],
];

/** The ten cases that teach it most. In the draft Bo has judged three; in the running playbook all, and one was wrong. */
export function judgedCases(variant: Variant): readonly JudgedCase[] {
  const draft: Readonly<Record<string, "right" | "wrong">> = { w1: "right", w3: "wrong", w4: "right" };
  return CASES.map(([id, what, would, happened, of]) => ({
    id,
    what,
    would,
    happened,
    of,
    said: variant === "draft" ? (draft[id] ?? null) : id === "w3" ? "wrong" : "right",
    why: id === "w3" ? "Raising money is not a sign." : null,
  }));
}
