import type { TreeRow, TreeView } from "~/modules/views-workspace/types.ts";
import { AMA, BO, CHIDI } from "./workspace-people.ts";
import { PAGES } from "./workspace-tree-pages.ts";
import { at, read, type Fixture } from "./read.ts";

/* The managers, each under the one that looks after it. Numbers are the last 7 days, own only: `rolled` adds what is below. */
type Own = Pick<
  TreeRow,
  | "id"
  | "name"
  | "above"
  | "job"
  | "version"
  | "connectors"
  | "mcp"
  | "limit"
  | "objective"
  | "standing"
  | "threads"
  | "now"
  | "changed"
  | "sentBack"
  | "came"
  | "work"
  | "out"
  | "open"
  | "waiting"
  | "cost"
  | "is"
>;
const ROWS: readonly Own[] = [
  {
    id: "root",
    name: "Juno",
    above: null,
    job: "Make, look after and improve the managers",
    version: 3,
    connectors: [],
    mcp: [],
    limit: 30,
    objective: "Every objective is on its line",
    standing: "below its line",
    threads: 1,
    now: "Trying version 5 of Support on past mail",
    changed: at("12 Nov 09:00"),
    sentBack: 0,
    came: 9,
    work: 4,
    out: 3,
    open: 1,
    waiting: 1,
    cost: 14,
    is: "working",
  },
  {
    id: "coding",
    name: "Coding",
    above: "root",
    job: "Take issues on acme/web to a merged pull request, or an honest no",
    version: 7,
    connectors: ["GitHub", "Slack"],
    mcp: ["Sentry"],
    limit: 200,
    objective: "20 fixes a week that stay fixed",
    standing: "on its line",
    threads: 4,
    now: "4 threads, newest on ACME-423",
    changed: at("21 Nov 09:02"),
    sentBack: 0.11,
    came: 86,
    work: 24,
    out: 19,
    open: 8,
    waiting: 2,
    cost: 148,
    is: "working",
  },
  {
    id: "docs",
    name: "Docs",
    above: "coding",
    job: "Keep the docs true after each merge",
    version: 2,
    connectors: ["GitHub"],
    mcp: [],
    limit: 25,
    objective: "Docs within a day of the merge",
    standing: "reached",
    threads: 0,
    now: "Waiting for the next merge",
    changed: at("3 Nov 09:00"),
    sentBack: 0,
    came: 19,
    work: 8,
    out: 8,
    open: 0,
    waiting: 0,
    cost: 12,
    is: "idle",
  },
  {
    id: "releases",
    name: "Releases",
    above: "coding",
    job: "Cut a release every second Thursday and tell people",
    version: 1,
    connectors: ["GitHub", "Email"],
    mcp: [],
    limit: 20,
    objective: "v2.3 out on 26 November",
    standing: "below its line",
    threads: 0,
    now: "Asks to cut v2.3 without the 150k fix",
    changed: at("18 Nov 11:15"),
    sentBack: 0,
    came: 11,
    work: 3,
    out: 1,
    open: 2,
    waiting: 1,
    cost: 9,
    is: "needs you",
  },
  {
    id: "support",
    name: "Support",
    above: "root",
    job: "Answer customers; hand bugs to Coding",
    version: 4,
    connectors: ["Email", "WhatsApp"],
    mcp: ["Customer database"],
    limit: 150,
    objective: "Answer in 2 hours",
    standing: "below its line",
    threads: 3,
    now: "WhatsApp number offline for 2 hours",
    changed: at("9 Nov 09:00"),
    sentBack: 0.17,
    came: 212,
    work: 131,
    out: 118,
    open: 27,
    waiting: 5,
    cost: 96,
    is: "stuck",
  },
  {
    id: "whatsapp",
    name: "WhatsApp desk",
    above: "support",
    job: "First answer on WhatsApp",
    version: 2,
    connectors: ["WhatsApp"],
    mcp: [],
    limit: 60,
    objective: "Answer in 30 minutes",
    standing: "below its line",
    threads: 0,
    now: "Not connected since 08:10",
    changed: at("9 Nov 09:00"),
    sentBack: 0.2,
    came: 94,
    work: 52,
    out: 44,
    open: 14,
    waiting: 3,
    cost: 38,
    is: "stuck",
  },
  {
    id: "sales",
    name: "Sales",
    above: "root",
    job: "Take a lead from first contact to a call",
    version: 6,
    connectors: ["Email", "CRM", "Calendar", "Slack"],
    mcp: ["Search"],
    limit: 100,
    objective: "12 good calls a week by 31 Dec",
    standing: "on its line",
    threads: 2,
    now: "2 threads, writing to new leads",
    changed: at("23 Nov 14:20"),
    sentBack: 0.08,
    came: 41,
    work: 33,
    out: 12,
    open: 21,
    waiting: 1,
    cost: 52,
    is: "working",
  },
];

/** Each row with what is below it added: the one place the tree is summed. */
function rolled(row: Own): TreeRow {
  const below = ROWS.filter((other) => other.above === row.id).map(rolled);
  const add = (pick: (one: TreeRow) => number, own: number): number => below.reduce((total, one) => total + pick(one), own);
  return {
    ...row,
    came: add((one) => one.came, row.came),
    work: add((one) => one.work, row.work),
    out: add((one) => one.out, row.out),
    open: add((one) => one.open, row.open),
    waiting: add((one) => one.waiting, row.waiting),
    cost: add((one) => one.cost, row.cost),
  };
}

export const TREE: TreeView = {
  rows: ROWS.map(rolled),
  answers: [AMA, BO, CHIDI],
  trying: [{ manager: "support", version: 5, against: 4, cases: 40 }],
  pages: PAGES,
};

export const TREE_FIXTURES: readonly Fixture[] = [read("/tree", {}, TREE)];
