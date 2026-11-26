import type { ThreadRef } from "~/modules/work/types.ts";
import type { ThreadsView } from "~/modules/views-manager/types.ts";
import { head, MIN, NOW } from "./managers-kit.ts";
import { at, read, type Fixture } from "./read.ts";

/* Coding's threads, as drawn: every thread is a fork, so they form a tree under the conversations the manager holds. */

type Row = ThreadsView["rows"][number];
const on = (id: string): ThreadRef => ({ connector: "github", account: "acme", place: "acme/web", id });

interface Seed {
  readonly id: string;
  readonly title: string;
  readonly under: string;
  readonly work: string | null;
  readonly state: Row["state"];
  readonly when: string;
  /** Minutes. Left out: it has not ended, so it has run since it began. */
  readonly took?: number;
  readonly cost: number;
  readonly knew: number;
  readonly said: string;
  readonly role?: Row["role"];
}

const SEEDS: readonly Seed[] = [
  {
    id: "thread-41",
    title: "List the Node 18 options",
    under: "c-own",
    work: "ACME-398",
    state: "ended",
    when: "22 Nov 14:20",
    took: 18,
    cost: 1.2,
    knew: 31,
    said: "Listed three ways, and who each breaks",
  },
  {
    id: "thread-42",
    title: "Ask about Node 18",
    under: "thread-41",
    work: "ACME-398",
    state: "waits",
    when: "22 Nov 14:41",
    cost: 0.6,
    knew: 9,
    said: "Asked who decides: merge now, or wait for v3",
  },
  {
    id: "thread-43",
    title: "Find the cause",
    under: "c-412",
    work: "ACME-412",
    state: "ended",
    when: "24 Nov 09:14",
    took: 11,
    cost: 0.9,
    knew: 6,
    said: "Found it: buffered in memory, cut at 128 MB",
  },
  {
    id: "thread-44",
    title: "Write the fix",
    under: "thread-43",
    work: "ACME-412",
    state: "ended",
    when: "24 Nov 09:31",
    took: 52,
    cost: 3.7,
    knew: 14,
    said: "Opened #418 with a test that fails without it",
  },
  {
    id: "thread-46",
    title: "Answer the review",
    under: "thread-44",
    work: "ACME-412",
    state: "working",
    when: "25 Nov 09:48",
    cost: 0.7,
    knew: 31,
    said: "Working on the third comment",
  },
  {
    id: "thread-45b",
    title: "Check it, fresh",
    under: "c-412",
    work: "ACME-412",
    state: "ended",
    when: "24 Nov 10:40",
    took: 14,
    cost: 1.1,
    knew: 3,
    said: "Done-when met. Asked for a test on an empty export",
    role: "checks",
  },
  {
    id: "thread-40",
    title: "Make the templates",
    under: "c-417",
    work: "ACME-417",
    state: "ended",
    when: "24 Nov 14:05",
    took: 100,
    cost: 4.2,
    knew: 5,
    said: "Templates done for all six mails",
  },
  {
    id: "thread-45",
    title: "Test in three mail clients",
    under: "thread-40",
    work: "ACME-417",
    state: "working",
    when: "25 Nov 02:54",
    cost: 2.1,
    knew: 17,
    said: "Two clients done, the third is running",
  },
  {
    id: "thread-39",
    title: "Update the library",
    under: "c-415",
    work: "ACME-415",
    state: "ended",
    when: "24 Nov 17:30",
    took: 65,
    cost: 3.1,
    knew: 4,
    said: "Two breaking changes handled in #419",
  },
  {
    id: "thread-47",
    title: "Check it, fresh",
    under: "c-415",
    work: "ACME-415",
    state: "working",
    when: "25 Nov 09:30",
    cost: 0.6,
    knew: 3,
    said: "Waiting for the check to finish",
    role: "checks",
  },
  {
    id: "thread-48",
    title: "Say what done means",
    under: "c-423",
    work: "ACME-423",
    state: "working",
    when: "25 Nov 09:42",
    cost: 0.3,
    knew: 2,
    said: "Reading the drawing",
  },
];

export function threadRow(seed: Seed): Row {
  const started = at(seed.when);
  return {
    id: seed.id,
    manager: "coding",
    work: seed.work,
    under: seed.under,
    agent: seed.role === "checks" ? "checker" : "coder",
    role: seed.role ?? "does",
    version: 7,
    model: "Claude Sonnet 5.5",
    on: seed.work === null ? null : on(seed.work.slice(5)),
    state: seed.state,
    started,
    took: seed.took === undefined ? NOW - started : seed.took * MIN,
    cost: seed.cost,
    title: seed.title,
    said: seed.said,
    knew: seed.knew,
  };
}

export const THREAD_ROWS: readonly Row[] = SEEDS.map(threadRow);

export const CODING_THREADS: Fixture = read(
  "/m/:manager/threads",
  { manager: "coding" },
  {
    head: head("coding"),
    rows: THREAD_ROWS,
    conversations: [
      { id: "c-own", name: "Coding's own conversation", work: null },
      { id: "c-412", name: "#engineering", work: "ACME-412" },
      { id: "c-417", name: "acme/web #417", work: "ACME-417" },
      { id: "c-415", name: "acme/web #415", work: "ACME-415" },
      { id: "c-423", name: "acme/web #423", work: "ACME-423" },
    ],
    ended7: 38,
    cost7: 148,
    limits: [
      { says: "Threads running at once", is: "6" },
      { says: "How deep a fork of a fork may go", is: "4" },
      { says: "Spend on one thread", is: "$8" },
      { says: "Spend on one piece of work", is: "$20" },
    ],
  },
);
