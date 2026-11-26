import type { Next } from "~/modules/work/types.ts";
import type { BoardView, Card } from "~/modules/views-manager/types.ts";
import { head, HOUR, MIN, NOW } from "./managers-kit.ts";
import { read, type Fixture } from "./read.ts";

/* Sales' board, as drawn: its own steps are the columns. 21 open, 9 wait for the customer, 1 waits for Bo. `more` are not drawn as cards. */

const COLUMNS: BoardView["columns"] = [
  { id: "look", name: "Look it up", tip: "Who they are, what they run, what they would pay", waits: false, more: 2 },
  { id: "write", name: "Write", tip: "A mail that names what it found", waits: false, more: 1 },
  { id: "read", name: "Read it fresh", tip: "A fresh reader checks the mail before it goes", waits: false, more: 0 },
  { id: "yes", name: "Bo says yes", tip: "Mail that needs a yes waits here", waits: true, more: 0 },
  { id: "send", name: "Send and follow", tip: "Sent, and waiting for an answer", waits: false, more: 7 },
  { id: "done", name: "Done", tip: "Won, or closed with the reason", waits: false, more: 9 },
];

type Who = Next["who"];
interface Seed {
  readonly id: string;
  readonly company: string;
  readonly about: string;
  readonly step: string;
  readonly kind: "asked" | "signal" | "quiet";
  readonly next: string;
  readonly who: string;
  readonly by?: Who;
  readonly thread?: true;
  readonly age: number;
}
const KIND = { asked: "Someone asks", signal: "A sign at a company", quiet: "A lead that went quiet" } as const;

const SEEDS: readonly Seed[] = [
  {
    id: "SALES-31",
    company: "Fernhill Dental",
    about: "Asked for a price for 10 seats, at 08:47.",
    step: "look",
    kind: "asked",
    next: "The practice and the price",
    who: "Researcher",
    by: "itself",
    thread: true,
    age: 67 * MIN,
  },
  {
    id: "SALES-33",
    company: "Lindqvist Paper",
    about: "A new head of operations, since 17 Nov.",
    step: "look",
    kind: "signal",
    next: "Who they are, and what they run",
    who: "Researcher",
    by: "itself",
    age: 2 * 24 * HOUR,
  },
  {
    id: "SALES-19",
    company: "Quarry & Co",
    about: "Declan Shaw asks if it reads from two systems.",
    step: "write",
    kind: "asked",
    next: "A mail that answers both questions",
    who: "Writer",
    by: "itself",
    thread: true,
    age: 49 * MIN,
  },
  {
    id: "SALES-32",
    company: "Brightside",
    about: "Bo asked for a mail about spring.",
    step: "write",
    kind: "asked",
    next: "A first draft",
    who: "Writer",
    by: "itself",
    age: 42 * MIN,
  },
  {
    id: "SALES-26",
    company: "Abbot Glass",
    about: "A new head of operations, since 9 Nov.",
    step: "read",
    kind: "signal",
    next: "A fresh read of the mail",
    who: "Reader",
    by: "itself",
    age: 5 * 24 * HOUR,
  },
  {
    id: "SALES-27",
    company: "Tern Hotels",
    about: "Opened two sites on 12 Nov.",
    step: "read",
    kind: "signal",
    next: "A fresh read of the mail",
    who: "Reader",
    by: "itself",
    age: 5 * 24 * HOUR,
  },
  {
    id: "SALES-34",
    company: "Harbor Foods",
    about: "Opened a site in Ghent on 19 Nov.",
    step: "yes",
    kind: "signal",
    next: "Bo’s yes on the mail",
    who: "Bo",
    by: { person: "bo" },
    age: 62 * MIN,
  },
  {
    id: "SALES-24",
    company: "Northwind",
    about: "Pat Reyes. Thursday at 14:00, 25 seats.",
    step: "send",
    kind: "asked",
    next: "Pat confirms the time",
    who: "Pat Reyes",
    by: "outside",
    age: 23 * MIN,
  },
  {
    id: "SALES-22",
    company: "Lumen Studio",
    about: "Offer for 8 seats, which stands until 28 Nov.",
    step: "send",
    kind: "asked",
    next: "Inês Costa answers the offer",
    who: "Inês Costa",
    by: "outside",
    age: 99 * MIN,
  },
  {
    id: "SALES-28",
    company: "Harbor Logistics",
    about: "Joris Dekker wants the price in writing before Friday.",
    step: "send",
    kind: "asked",
    next: "Joris answers the price",
    who: "Joris Dekker",
    by: "outside",
    age: 14 * MIN,
  },
  {
    id: "SALES-30",
    company: "Tidewater Foods",
    about: "No answer for three days. Reminded at 08:02.",
    step: "send",
    kind: "quiet",
    next: "Gwen answers, or a last reminder on 28 Nov",
    who: "Gwen Pryce",
    by: "outside",
    age: 112 * MIN,
  },
  {
    id: "SALES-14",
    company: "Alder Finance",
    about: "Won: 30 seats, a year.",
    step: "done",
    kind: "asked",
    next: "",
    who: "Bo",
    age: 24 * HOUR,
  },
  {
    id: "SALES-15",
    company: "Kestrel Air",
    about: "Won: 12 seats.",
    step: "done",
    kind: "asked",
    next: "",
    who: "Ama",
    age: 4 * 24 * HOUR,
  },
  {
    id: "SALES-16",
    company: "Copperline Energy",
    about: "Said no, and why: too small a fit.",
    step: "done",
    kind: "asked",
    next: "",
    who: "Sales",
    age: 5 * 24 * HOUR,
  },
];

function card(seed: Seed): Card {
  const done = seed.step === "done";
  const next: Next | null = done || seed.by === undefined ? null : { what: seed.next, who: seed.by, by: NOW + 24 * HOUR };
  const waits =
    seed.by !== undefined && typeof seed.by === "object" && "person" in seed.by ? { ask: `ask-${seed.id}`, person: seed.by.person } : null;
  return {
    work: {
      id: seed.id,
      title: seed.company,
      about: seed.about,
      kind: seed.kind,
      step: seed.step,
      priority: "soon",
      order: SEEDS.indexOf(seed),
      cost: 0.5,
      waits,
      next,
    },
    kindName: KIND[seed.kind],
    from: seed.kind === "signal" ? "A search" : "Mail",
    says: done ? `Closed by ${seed.who}` : `Next: ${seed.next}`,
    who: seed.who,
    links: [],
    thread: seed.thread === true ? `thread-${seed.id.slice(6)}` : null,
    since: NOW - seed.age,
    doneWhen: { met: done ? 1 : 0, of: 1 },
  };
}

export const SALES_BOARD: Fixture = read(
  "/m/:manager/board",
  { manager: "sales" },
  {
    head: head("sales"),
    totals: { open: 21, outside: 9, person: 1 },
    columns: COLUMNS,
    cards: SEEDS.map(card),
  },
);
