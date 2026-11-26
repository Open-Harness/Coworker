import type { Next } from "~/modules/work/types.ts";
import type { BoardView, Card } from "~/modules/views-manager/types.ts";
import { head, HOUR, MIN, NOW } from "./managers-kit.ts";
import { at, read, type Fixture } from "./read.ts";

/* Coding's board, as drawn: the five steps its process decided, and eleven pieces of work. */

const COLUMNS: BoardView["columns"] = [
  { id: "triage", name: "Triage", tip: "Understand it, say what done means, or ask one question", waits: false, more: 0 },
  { id: "building", name: "Building", tip: "A thread works in its own copy of the repo", waits: false, more: 0 },
  { id: "checking", name: "Checking", tip: "A fresh thread compares the result with done-when", waits: false, more: 0 },
  { id: "person", name: "With a person", tip: "A review on GitHub, or an answer", waits: true, more: 0 },
  { id: "done", name: "Done", tip: "Merged, or closed with the reason", waits: false, more: 0 },
];

type Who = Next["who"];
interface Seed {
  readonly id: string;
  readonly title: string;
  readonly about: string;
  readonly step: string;
  readonly kind: "bug" | "feature" | "upkeep";
  readonly from: string;
  readonly next: string;
  readonly who?: Who;
  readonly thread?: string;
  readonly pr?: string;
  readonly age: number;
  readonly met: number;
  readonly of: number;
  readonly cost: number;
  readonly waits?: "ama" | "chidi";
}
const KIND = { bug: "Bug", feature: "Feature", upkeep: "Upkeep" } as const;
const NAME: Readonly<Record<string, string>> = { ama: "Ama Mensah", chidi: "Chidi Okafor" };

const SEEDS: readonly Seed[] = [
  {
    id: "ACME-421",
    title: "Sign in with GitHub loops on Safari",
    about: "Reported by two people. Asked which Safari version.",
    step: "triage",
    kind: "bug",
    from: "Issue #421",
    next: "An answer from the reporter",
    who: "outside",
    age: 2 * HOUR,
    met: 0,
    of: 2,
    cost: 0.3,
  },
  {
    id: "ACME-423",
    title: "Show the plan on the billing page",
    about: "Feature request with a drawing. Needs a done-when.",
    step: "triage",
    kind: "feature",
    from: "Issue #423",
    next: "Coding reads it",
    who: "itself",
    thread: "thread-48",
    age: 12 * MIN,
    met: 0,
    of: 0,
    cost: 0.3,
  },
  {
    id: "ACME-412",
    title: "Export drops rows over 150k",
    about: "Stream the export instead of building it in memory.",
    step: "building",
    kind: "bug",
    from: "Issue #412",
    next: "Review comments answered",
    who: "itself",
    thread: "thread-46",
    pr: "#418",
    age: 24 * HOUR,
    met: 3,
    of: 5,
    cost: 6.4,
  },
  {
    id: "ACME-417",
    title: "Dark mode for emails",
    about: "Templates done, testing in three mail clients.",
    step: "building",
    kind: "feature",
    from: "Issue #417",
    next: "Screenshots from the test",
    who: "itself",
    thread: "thread-45",
    age: 7 * HOUR,
    met: 1,
    of: 3,
    cost: 6.3,
  },
  {
    id: "ACME-415",
    title: "Update the payment library",
    about: "Two breaking changes handled.",
    step: "checking",
    kind: "upkeep",
    from: "Dependabot #415",
    next: "The check finishes",
    who: "ci",
    thread: "thread-47",
    pr: "#419",
    age: 5 * HOUR,
    met: 2,
    of: 3,
    cost: 3.7,
  },
  {
    id: "ACME-409",
    title: "Keyboard order in the sidebar",
    about: "Done-when met, waiting for CI.",
    step: "checking",
    kind: "bug",
    from: "Issue #409",
    next: "CI",
    who: "ci",
    pr: "#416",
    age: 24 * HOUR,
    met: 2,
    of: 2,
    cost: 2.1,
  },
  {
    id: "ACME-404",
    title: "Rate limit on the public API",
    about: "Chidi reviews. Asked twice about the limit per key.",
    step: "person",
    kind: "feature",
    from: "Issue #404",
    next: "Chidi’s review",
    who: { person: "chidi" },
    pr: "#413",
    age: 48 * HOUR,
    met: 3,
    of: 4,
    cost: 8.9,
    waits: "chidi",
  },
  {
    id: "ACME-398",
    title: "Drop Node 18",
    about: "Breaks one customer’s build. Merge now, or wait for v3?",
    step: "person",
    kind: "upkeep",
    from: "Coding’s own",
    next: "Your answer",
    who: { person: "ama" },
    age: 72 * HOUR,
    met: 1,
    of: 2,
    cost: 1.8,
    waits: "ama",
  },
  {
    id: "ACME-411",
    title: "Timezone off by one in reports",
    about: "Merged, and Support told the two customers.",
    step: "done",
    kind: "bug",
    from: "Support",
    next: "",
    pr: "#414",
    age: 4 * HOUR,
    met: 3,
    of: 3,
    cost: 4.1,
  },
  {
    id: "ACME-410",
    title: "Typo in the invite mail",
    about: "Merged.",
    step: "done",
    kind: "upkeep",
    from: "Issue #410",
    next: "",
    pr: "#420",
    age: 9 * HOUR,
    met: 1,
    of: 1,
    cost: 0.4,
  },
  {
    id: "ACME-406",
    title: "Support for Internet Explorer",
    about: "Closed as no, with the reason.",
    step: "done",
    kind: "feature",
    from: "Issue #406",
    next: "",
    age: 24 * HOUR,
    met: 0,
    of: 0,
    cost: 0.2,
  },
];

export function card(seed: Seed): Card {
  const done = seed.step === "done";
  const next: Next | null = done || seed.who === undefined ? null : { what: seed.next, who: seed.who, by: at("26 Nov 09:00") };
  const waits = seed.waits === undefined ? null : { ask: `ask-${seed.id}`, person: seed.waits };
  const work: Card["work"] = {
    id: seed.id,
    title: seed.title,
    about: seed.about,
    kind: seed.kind,
    step: seed.step,
    priority: "soon",
    order: SEEDS.indexOf(seed),
    cost: seed.cost,
    waits,
    next,
  };
  const who =
    typeof seed.who === "object"
      ? "person" in seed.who
        ? (NAME[seed.who.person] ?? "")
        : "Coding"
      : done
        ? "Coding"
        : seed.who === "outside"
          ? "The reporter"
          : "Coding";
  return {
    work,
    kindName: KIND[seed.kind],
    from: seed.from,
    says: seed.thread !== undefined ? "A thread is working on it" : done ? "Nothing left to do" : `Next: ${seed.next}`,
    who,
    links: seed.pr === undefined ? [] : [{ label: seed.pr, link: `/m/coding/connectors/github/${seed.pr.slice(1)}` }],
    thread: seed.thread ?? null,
    since: NOW - seed.age,
    doneWhen: { met: seed.met, of: seed.of },
  };
}

export const CODING_BOARD_VIEW: BoardView = {
  head: head("coding"),
  totals: { open: 8, outside: 1, person: 2 },
  columns: COLUMNS,
  cards: SEEDS.map(card),
};
export const CODING_BOARD: Fixture = read("/m/:manager/board", { manager: "coding" }, CODING_BOARD_VIEW);
