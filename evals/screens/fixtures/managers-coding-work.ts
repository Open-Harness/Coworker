import type { Check } from "~/modules/playbook/types.ts";
import type { Evidence, Work } from "~/modules/work/types.ts";
import { head } from "./managers-kit.ts";
import { THREAD_ROWS } from "./managers-coding-threads.ts";
import { at, read, type Fixture } from "./read.ts";

/* ACME-412, as drawn: a bug from GitHub issue #412 and a mail from Northwind, being built, 3 of 5 done-when met. */

const code: Evidence["by"] = { code: true };
const by = (thread: string): Evidence["by"] => ({ agent: thread === "thread-45b" ? "checker" : "coder", thread });
const check = (id: string, says: string): Check => ({ id, says, by: "agent" });

const DONE_WHEN = [
  check("rows", "An export of 212,000 rows has every row"),
  check("memory", "Memory stays under 128 MB while it runs"),
  check("docs", "The docs no longer name a limit"),
  check("review", "Every review comment is answered or done"),
  check("told", "Pat Reyes is told, in the same mail"),
];

const EVIDENCE: readonly Evidence[] = [
  {
    check: "rows",
    met: true,
    says: "Test export-large, run by thread-44",
    link: "/m/coding/threads/thread-44",
    by: by("thread-44"),
    at: at("24 Nov 10:20"),
  },
  { check: "memory", met: true, says: "Measured at 61 MB", by: by("thread-44"), at: at("24 Nov 10:21") },
  { check: "docs", met: true, says: "Changed in #418, read by Docs", by: { agent: "docs", thread: "thread-45b" }, at: at("24 Nov 10:50") },
  { check: "review", met: false, says: "2 of 3", by: code, at: at("25 Nov 09:54") },
  { check: "told", met: false, says: "After the merge", by: code, at: at("25 Nov 09:54") },
];

const WORK: Work = {
  id: "ACME-412",
  manager: "coding",
  kind: "bug",
  version: 7,
  title: "Export drops rows over 150k",
  about:
    "Exports over 150,000 rows finish without an error but miss the last rows. The export is built in memory and cut off when the worker runs out. Northwind exports 212,000 rows every Monday, and noticed.",
  from: { connector: "github", account: "acme", place: "acme/web", id: "412" },
  asked: "chidi",
  answers: "coding",
  mandate: { grants: [], limits: { perWork: 20 }, strength: "asked", because: { by: "person", id: "chidi" }, version: 7, state: "holds" },
  doneWhen: DONE_WHEN,
  evidence: EVIDENCE,
  step: "building",
  sentBack: { building: 1 },
  threads: THREAD_ROWS.filter((row) => row.work === "ACME-412").map((row) => ({
    id: row.id,
    agent: row.agent,
    role: row.role === "checks" ? "checks" : "does",
    state: row.state === "ended" ? "ended" : "working",
  })),
  follows: [
    { connector: "github", account: "acme", place: "acme/web", id: "418" },
    { connector: "email", account: "juno", place: "support", id: "SUP-88" },
  ],
  next: { what: "Review comments answered", who: "itself", by: at("26 Nov 09:00") },
  waits: null,
  chased: false,
  cost: 6.4,
  ended: null,
  order: 3,
  priority: "now",
};

export const CODING_WORK: Fixture = read(
  "/m/:manager/work/:work",
  { manager: "coding", work: "ACME-412" },
  {
    head: head("coding"),
    work: WORK,
    kindName: "Bug",
    stepName: "Building",
    answers: { id: "coding", name: "Coding", is: "manager" },
    labels: ["Export", "Northwind", "Memory"],
    told: [
      { id: "ama", name: "Ama Mensah", role: "Owner", initials: "AM" },
      { id: "chidi", name: "Chidi Okafor", role: "Member", initials: "CO" },
    ],
    options: {
      steps: [
        { id: "triage", name: "Triage" },
        { id: "building", name: "Building" },
        { id: "checking", name: "Checking" },
        { id: "person", name: "With a person" },
        { id: "done", name: "Done" },
      ],
      kinds: [
        { id: "bug", name: "Bug" },
        { id: "feature", name: "Feature" },
        { id: "upkeep", name: "Upkeep" },
      ],
      answerers: [
        { id: "coding", name: "Coding", is: "manager" },
        { id: "ama", name: "Ama Mensah", is: "person" },
        { id: "chidi", name: "Chidi Okafor", is: "person" },
        { id: "bo", name: "Bo Larsen", is: "person" },
      ],
    },
    asked: "Chidi Okafor",
    from: "GitHub issue #412 and a mail from Northwind",
    started: at("24 Nov 09:12"),
    limit: 20,
    attention: 4,
    approach: "Stream the rows from the database to the file in pages of 5,000, so memory does not grow with the size of the export.",
    threads: THREAD_ROWS.filter((row) => row.work === "ACME-412").map(({ id, agent, role, state, started, took, cost, title, said }) => ({
      id,
      agent,
      role,
      state,
      started,
      took,
      cost,
      brief: said,
      title,
      said,
    })),
    links: [
      { is: "Issue", id: "acme/web #412", title: "Export drops rows over 150k", says: "Open", link: "/m/coding/connectors/github/412" },
      {
        is: "Pull request",
        id: "acme/web #418",
        title: "Stream exports in pages",
        says: "CI passed, 1 comment open",
        link: "/m/coding/connectors/github/418",
      },
      {
        is: "Mail",
        id: "Support SUP-88",
        title: "Re: Monday export is short",
        says: "Pat Reyes waits",
        link: "/m/support/connectors/email",
      },
    ],
    evidence: [
      {
        name: "export-large.test.ts",
        says: "Fails before, passes after",
        size: "Test",
        by: "thread-44",
        link: "/m/coding/work/ACME-412/evidence/export-large",
      },
      {
        name: "memory-212k.txt",
        says: "Highest use 61 MB",
        size: "3 KB",
        by: "thread-44",
        link: "/m/coding/work/ACME-412/evidence/memory-212k",
      },
      {
        name: "check-report.md",
        says: "What the fresh check looked at",
        size: "6 KB",
        by: "thread-45b",
        link: "/m/coding/work/ACME-412/evidence/check-report",
      },
    ],
    activity: [
      { who: "Coding", at: at("25 Nov 09:48"), text: "Started thread-46 to answer Chidi’s review." },
      { who: "Chidi Okafor", at: at("25 Nov 09:41"), text: "Left 3 comments on #418, on GitHub." },
      { who: "Coding", at: at("24 Nov 10:56"), text: "Asked Chidi to review #418." },
      { who: "Support", at: at("24 Nov 09:20"), text: "Handed over Pat Reyes’s mail: they export 212,000 rows every Monday." },
      { who: "Coding", at: at("24 Nov 09:12"), text: "Took the issue, and wrote what done means." },
    ],
  },
);
