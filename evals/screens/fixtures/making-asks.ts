import type { Question, Wants } from "~/modules/walkthrough/types.ts";
import type { SetUpView } from "~/modules/views-manager/types.ts";

/* What Juno's set-up skill wrote for this one objective: its questions, what it would like to look at. design/src/screens/setup/data.ts. */

const MAIL = "reach/email/juno@acme.co-worker.tech";
export const FIRST: readonly Question[] = [
  {
    id: "good",
    ask: "When is a call a good one?",
    picks: ["held", "booked", "offer"],
    best: "held",
    because: "You said good calls, not calls. This is what I will be measured by.",
    changes: ["objective", "objective/measure"],
  },
  {
    id: "worse",
    ask: "What must not get worse?",
    picks: ["bo", "stop", "cost"],
    best: "bo",
    because: "You named Bo’s day. The other two are what usually goes wrong.",
    changes: ["objective/notWorse", "reach/limits"],
  },
  {
    id: "far",
    ask: "When I find a company that did not ask, what may I do?",
    picks: ["ask", "tell", "do"],
    best: "ask",
    because: "Writing first is the one thing here that cannot be taken back.",
    changes: ["workflow/signal", MAIL],
  },
];
export const SECOND: readonly Question[] = [
  {
    id: "list",
    ask: "Which companies do I watch?",
    picks: ["target", "leads", "both"],
    best: "target",
    because: "28 of your 46 wins began with a change at the company. Bo keeps “Target accounts” up to date; the open leads are older.",
    changes: ["triggers/signs"],
  },
  {
    id: "answer",
    ask: "38 of 96 mails waited more than a day. May I answer those?",
    picks: ["site", "all", "draft"],
    best: "site",
    because: "Most came while Bo was on calls. 29 of the 38 asked something that is on the site.",
    changes: ["workflow/asked", MAIL],
  },
];
export const ANSWERS = { good: "held", worse: "bo,stop,cost", far: "ask", list: "target", answer: "site" } as const;

const one = (id: string, label: string, about: string | null = null) => ({ id, label, about });
export const ASKED: SetUpView["asked"] = {
  good: {
    many: false,
    best: ["held"],
    options: [
      one("held", "It took place, with a company that fits", "Bo says so in the CRM after each one"),
      one("booked", "It was booked", "Easy to count. I could fill the calendar with the wrong people"),
      one("offer", "It led to an offer", "Truer, but known only after about 40 days"),
    ],
  },
  worse: {
    many: true,
    best: ["bo", "stop", "cost"],
    options: [
      one("bo", "Bo’s time per good call", "Under 10 minutes. Bo guesses 17 now"),
      one("stop", "People who say stop", "Fewer than 3 in 100"),
      one("cost", "Cost per good call", "Under $15"),
    ],
  },
  far: {
    many: false,
    best: ["ask"],
    options: [
      one("ask", "Draft it, and ask Bo each time", "We look again after two weeks"),
      one("tell", "Only tell Bo"),
      one("do", "Write by myself"),
    ],
  },
  list: {
    many: false,
    best: ["target"],
    options: [
      one("target", "Target accounts, 140"),
      one("leads", "Every open lead, 212", "About $9 a week more"),
      one("both", "Both, 318"),
    ],
  },
  answer: {
    many: false,
    best: ["site"],
    options: [
      one("site", "Yes, when the answer is on the site", "The rest I draft for Bo"),
      one("all", "Yes, all of them"),
      one("draft", "Draft all of them for Bo"),
    ],
  },
};

type Want = Omit<Wants, "state">;
export const WANTS: readonly Want[] = [
  { connector: "email", reads: "Mail to juno@, 30 days", tells: "Who asks, and how long they wait", without: "" },
  {
    connector: "crm",
    reads: "Deals, calls and notes, 2 years",
    tells: "Where wins began, where leads are lost",
    without: "I would guess which companies to watch",
  },
  {
    connector: "calendar",
    reads: "Free and busy, and calls with people outside",
    tells: "When calls fit, and how many took place",
    without: "Bo books the calls",
  },
  {
    connector: "recordings",
    reads: "Words of the last 40 calls",
    tells: "What Bo asks, and what makes a call good",
    without: "I learn it from what Bo marks, more slowly",
  },
];
export const STATES: readonly Wants["state"][] = ["connected", "connected", "asked", "skipped"];
export const LOOKS: SetUpView["looks"] = [
  { name: "Mail", had: "Support uses it", signs: null },
  { name: "CRM", had: null, signs: null },
  { name: "Bo’s calendar", had: null, signs: "Bo" },
  { name: "Call recordings", had: null, signs: null },
];
