import type { Standing } from "~/modules/measures/types.ts";
import type { Day, OverviewView, Tile } from "~/modules/views-workspace/types.ts";
import { at, read, type Fixture } from "./read.ts";

/* All managers together, for the last 7, 30 or 90 days. The 7 days are the sum of the seven managers, each counted once. */
const DAYS = ["19 Nov", "20 Nov", "21 Nov", "22 Nov", "23 Nov", "24 Nov", "25 Nov"] as const;
const came = [70, 82, 78, 27, 24, 96, 95];
const out = [29, 35, 36, 12, 11, 40, 42];
const sentBack = [0.187, 0.175, 0.163, 0.163, 0.14, 0.14, 0.128];
const cost = [57, 62, 66, 25, 23, 74, 62];
const people = [70, 74, 72, 16, 14, 84, 78];
const wait = [2.5, 2.7, 2.6, 2.9, 3, 3.4, 3.1];
const days = (
  series: readonly [readonly number[], readonly number[], readonly number[], readonly number[], readonly number[], readonly number[]],
): readonly Day[] =>
  DAYS.map((day, i) => ({
    day: at(`${day} 00:00`),
    came: series[0][i] ?? 0,
    out: series[1][i] ?? 0,
    sentBack: series[2][i] ?? 0,
    cost: series[3][i] ?? 0,
    people: series[4][i] ?? 0,
    wait: series[5][i] ?? 0,
  }));
const NOW = days([came, out, sentBack, cost, people, wait]);
const BEFORE = days([
  [59, 69, 66, 23, 20, 81, 80],
  [25, 30, 31, 10, 9, 34, 36],
  [0.156, 0.144, 0.132, 0.132, 0.109, 0.109, 0.097],
  [52, 57, 60, 23, 21, 68, 57],
  [80, 84, 82, 18, 16, 96, 89],
  [2.4, 2.4, 2.3, 2.3, 2.4, 2.4, 2.4],
]);

const tile = (
  id: string,
  label: string,
  value: number,
  unit: Tile["unit"],
  change: number,
  better: Tile["better"],
  points: readonly number[],
  more: Partial<Tile> = {},
): Tile => ({ id, label, value, unit, change, better, points, ...more });
const tiles = (period: "7" | "30" | "90"): readonly Tile[] => {
  const pick = <T>(week: T, month: T, quarter: T): T => (period === "7" ? week : period === "30" ? month : quarter);
  return [
    tile("line", "Objectives on their line", 3, "of", pick(1, 0, 2), "more", [], { of: 6 }),
    tile("people", "Your team’s time", pick(6.8, 31, 118), "hours", pick(-0.121, -0.184, -0.352), "less", people),
    tile("wait", "A customer’s wait", pick(3.1, 2.6, 2.4), "hours", pick(0.31, 0.083, -0.41), "less", wait),
    tile("sent", "Undone or sent back", pick(0.16, 0.15, 0.14), "share", pick(0.031, 0.014, -0.005), "less", sentBack),
    tile("waiting", "Waiting on people", 13, "count", pick(0.182, 0.083, 0.444), "less", []),
    tile("cost", "What it cost", pick(369, 1540, 4480), "dollars", pick(0.092, 0.116, 0.171), "less", cost),
  ];
};

const read7 = (now: number, aim: number, line: number, is: "on its line" | "below its line" | "reached", since: string): Standing => ({
  _tag: "Read",
  now,
  aim,
  line,
  is,
  since: at(since),
  before: null,
  points: [{ at: at("18 Nov 08:00"), value: now, line }],
});
type Goal = OverviewView["objectives"][number];
const goal = (
  manager: string,
  name: string,
  says: string,
  standing: Standing,
  is: Goal["is"],
  progress: number,
  shouldBe: number,
  unit: Goal["unit"],
): Goal => ({ manager, name, says, standing, is, progress, shouldBe, unit });

/** Furthest from its line first. */
const OBJECTIVES: readonly Goal[] = [
  goal(
    "whatsapp",
    "WhatsApp desk",
    "Answer in 30 minutes",
    read7(1.9, 0.5, 0.5, "below its line", "20 Nov 08:00"),
    "stuck",
    0.48,
    1,
    "hours",
  ),
  goal("support", "Support", "Answer in 2 hours", read7(3.1, 2, 2, "below its line", "20 Nov 08:00"), "stuck", 0.64, 1, "hours"),
  goal("releases", "Releases", "v2.3 out on 26 November", read7(3, 5, 5, "below its line", "24 Nov 08:00"), "needs you", 0.6, 1, "steps"),
  goal("root", "Juno", "Every objective is on its line", read7(3, 6, 6, "below its line", "24 Nov 08:00"), "working", 0.5, 1, "of"),
  goal("sales", "Sales", "12 good calls a week by 31 Dec", read7(9, 12, 9, "on its line", "18 Nov 08:00"), "working", 0.75, 0.75, "count"),
  goal(
    "coding",
    "Coding",
    "20 fixes a week that stay fixed",
    read7(18, 20, 17.2, "on its line", "18 Nov 08:00"),
    "working",
    0.9,
    0.86,
    "count",
  ),
  goal("docs", "Docs", "Docs within a day of the merge", read7(8, 8, 8, "reached", "18 Nov 08:00"), "idle", 1, 1, "count"),
];

const view = (period: "7" | "30" | "90"): OverviewView => ({
  period,
  updated: at("25 Nov 09:54"),
  tiles: tiles(period),
  daily: NOW,
  dailyBefore: BEFORE,
  objectives: OBJECTIVES,
  changed: [
    {
      tone: "wrong",
      title: "Support is slower: 3.1 hours, the aim is 2",
      text: "WhatsApp messages grew by a third and the number has been offline since 08:10. A person must scan it again: it is in your inbox.",
      link: "/inbox",
    },
    {
      tone: "better",
      title: "Coding sends less back: 17% to 11%",
      text: "Version 7 asks what done means before it starts. Kept.",
      link: "/m/coding",
    },
    {
      tone: "proposes",
      title: "Trying version 5 of Support",
      text: "Runs on 40 past mails beside version 4. 12 done: 2 better, 10 the same.",
      link: "/m/support",
    },
  ],
});

export const OVERVIEW: readonly Fixture[] = [
  read("/overview?period", {}, view("7")),
  read("/overview?period", { period: "7" }, view("7")),
  read("/overview?period", { period: "30" }, view("30")),
  read("/overview?period", { period: "90" }, view("90")),
];
