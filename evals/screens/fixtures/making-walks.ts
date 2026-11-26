import type { Finding, Stage, Walkthrough } from "~/modules/walkthrough/types.ts";
import type { Figure, SetUpView, Tried } from "~/modules/views-manager/types.ts";
import { at, read, type Fixture } from "./read.ts";
import { ANSWERS, ASKED, FIRST, LOOKS, SECOND, STATES, WANTS } from "./making-asks.ts";
import { OBJECTIVE, SAID } from "./sales-parts.ts";
import { judgedCases } from "./sales-notes.ts";
import { salesFiles, salesView } from "./sales-playbook.ts";

/* Setting Sales up from what Bo and Ama said on 5 October: the walk at each of its steps. design/src/screens/setup. */

const FINDINGS: readonly (Finding & { readonly figure: Figure })[] = [
  {
    id: "began",
    says: "Most wins began with a change at the company",
    from: "CRM, the 46 deals won this year, and the note on each",
    wrong: null,
    figure: {
      _tag: "Bars",
      of: 46,
      rows: [
        { label: "A change at the company", n: 28, note: null },
        { label: "They wrote to us", n: 14, note: null },
        { label: "An event", n: 4, note: null },
      ],
    },
  },
  {
    id: "lost",
    says: "Leads are lost while they wait",
    from: "Mail and CRM, the 96 people who wrote in 30 days",
    wrong: null,
    figure: {
      _tag: "Bars",
      of: 96,
      rows: [
        { label: "Wrote to us", n: 96, note: null },
        { label: "Answered within a day", n: 58, note: "38 waited longer" },
        { label: "Answered us back", n: 41, note: null },
        { label: "Call booked", n: 22, note: "Bo reminded 6 of the 19 that went quiet" },
        { label: "Good call", n: 20, note: "2 did not take place" },
      ],
    },
  },
  {
    id: "today",
    says: "How Bo does it today",
    from: "Mail, CRM, and what Bo told Ama",
    wrong: null,
    figure: {
      _tag: "Said",
      text: "Bo reads a new mail, looks the company up for about 6 minutes, answers from an old mail, and sets a reminder in the calendar. 13 of the last 40 reminders were moved and then forgotten.",
    },
  },
  {
    id: "often",
    says: "Once a day is often enough to look",
    from: "The same search, tried on the last 30 days",
    wrong: null,
    figure: {
      _tag: "Tries",
      rows: [
        { look: "Every hour", finds: 22, late: 0, cost: 78, picked: false },
        { look: "Weekdays, 07:00", finds: 22, late: 0, cost: 13, picked: true },
        { look: "Mondays", finds: 13, late: 4, cost: 3, picked: false },
      ],
    },
  },
  {
    id: "unknown",
    says: "What I could not know",
    from: "Skipped, or not there",
    wrong: null,
    figure: {
      _tag: "Said",
      text: "What makes a call good, from the calls themselves. I start from what Bo marks, and say so in the draft.",
    },
  },
];

const STEPS: SetUpView["steps"] = [
  {
    label: "What you want",
    about: "In your own words.",
    title: "What do you want to get to?",
    lead: "Say it as you would to a colleague. Juno writes the rest of these steps from it.",
  },
  {
    label: "Three questions",
    about: "What only you know.",
    title: "Three things only you know",
    lead: "Juno has an answer for each. Change what is wrong.",
  },
  {
    label: "Connect, to look",
    about: "How it has gone so far.",
    title: "May I look at how it has gone?",
    lead: "To read only, and only until the draft is made or thrown away. Skip what you like: I say what I then cannot know.",
  },
  {
    label: "What I found",
    about: "And where I may be wrong.",
    title: "How it has gone so far",
    lead: "From 2 years of the CRM and 30 days of mail. Say where it is wrong.",
  },
  {
    label: "Two more",
    about: "From what I found.",
    title: "Two questions from what I found",
    lead: "The last ones. What is left, I guess, and mark as my idea in the draft.",
  },
  {
    label: "The draft",
    about: "All of it, to change.",
    title: "The draft is ready",
    lead: "Everything Sales would be. Nothing is made yet.",
  },
];

/** What the draft holds after each step: how it reads, part by part. */
const PARTS = ["Objective", "Workflow", "Triggers", "Agents", "Skills", "Reach", "Evals"] as const;
const SO_FAR: readonly (readonly string[])[] = [
  ["12 a week, by 31 Dec", "", "", "", "", "", ""],
  ["12 a week, by 31 Dec", "", "", "", "", "", ""],
  ["12 a week, 3 that must not", "Ask Bo before writing first", "", "", "", "$15 a good call", "Good call, set by Bo"],
  [
    "12 a week, 3 that must not",
    "4 kinds of work",
    "1 cron, tried 3 ways",
    "3 agents",
    "9 skills, 1 to write",
    "$15 a good call",
    "Good call, 3 guards",
  ],
  [
    "12 a week, 3 that must not",
    "4 kinds of work, 6 steps",
    "1 cron, tried 3 ways",
    "3 agents",
    "9 skills, 2 to write",
    "$15 a good call",
    "Good call, 3 guards",
  ],
  [
    "12 a week, 3 that must not",
    "4 kinds of work, 6 steps",
    "2 crons, 2 events, 1 wait, asked",
    "3 agents",
    "12 skills, 3 new",
    "Mail, CRM, calendar, $20 a day",
    "10 measures, 148 cases",
  ],
];
const sofar = (step: number): SetUpView["sofar"] =>
  PARTS.map((part, i) => {
    const says = SO_FAR[step]?.[i] ?? "";
    return { part, says, isNew: says !== "" && says !== (SO_FAR[step - 1]?.[i] ?? "") };
  });

const TRIED: Tried = {
  from: at("5 Sep 00:00"),
  to: at("4 Oct 23:59"),
  came: 148,
  took: 61,
  asked: 22,
  watched: 18,
  left: 47,
  cost: 94,
  personNow: 360,
  personWould: 40,
};

interface Where {
  readonly stage: Stage;
  readonly round: 0 | 1 | 2;
  readonly answered: 0 | 1 | 2;
  readonly looked: boolean;
  readonly found: boolean;
  readonly drafted: boolean;
}
function walk(id: string, where: Where): Walkthrough {
  const rounds = [FIRST, SECOND].slice(0, where.round).map((questions, i) => ({
    questions,
    answers: i < where.answered ? Object.fromEntries(questions.map((q) => [q.id, ANSWERS[q.id as keyof typeof ANSWERS]])) : {},
  }));
  return {
    id,
    by: "ama",
    stage: where.stage,
    said: SAID,
    objective: OBJECTIVE,
    rounds,
    wants: where.looked ? WANTS.map((want, i) => ({ ...want, state: STATES[i] ?? "asked" })) : [],
    findings: where.found ? FINDINGS.map(({ figure: _, ...finding }) => finding) : [],
    draft: where.drafted ? salesFiles("draft") : null,
    cases: where.drafted ? judgedCases("draft") : [],
    made: null,
  };
}

function view(id: string, step: number, where: Where): SetUpView {
  return {
    walk: walk(id, where),
    steps: STEPS,
    heard: "12 good calls a week by 31 December, 5 now, without taking more of Bo’s day.",
    writtenBy: { skill: "Set up a manager", version: 14 },
    asked: ASKED,
    looks: LOOKS,
    figures: Object.fromEntries(FINDINGS.map((finding) => [finding.id, finding.figure])),
    sofar: sofar(step),
    tried: where.drafted ? TRIED : null,
    draft: where.drafted ? salesView("draft") : null,
  };
}

const AT_ASK = view("at-ask", 0, { stage: "first questions", round: 1, answered: 0, looked: false, found: false, drafted: false });
const AT_CONNECT = view("at-connect", 1, { stage: "connect", round: 1, answered: 1, looked: true, found: false, drafted: false });
const AT_FOUND = view("at-found", 2, { stage: "found", round: 1, answered: 1, looked: true, found: true, drafted: false });
const AT_ASK_2 = view("at-ask-2", 3, { stage: "second questions", round: 2, answered: 1, looked: true, found: true, drafted: false });
const MORE_CALLS = view("more-calls", 4, { stage: "draft", round: 2, answered: 2, looked: true, found: true, drafted: true });

const on = (walk: string, value: SetUpView): Fixture => read("/set-up/:walk", { walk }, value);
export const WALKS: readonly Fixture[] = [
  on("at-ask", AT_ASK),
  on("at-connect", AT_CONNECT),
  on("at-found", AT_FOUND),
  on("at-ask-2", AT_ASK_2),
  on("more-calls", MORE_CALLS),
];
/** What the next press answers: the walk one step on. */
export const ONWARD: Readonly<Record<string, SetUpView>> = {
  "at-ask": AT_CONNECT,
  "at-connect": AT_FOUND,
  "at-found": AT_ASK_2,
  "at-ask-2": MORE_CALLS,
};
