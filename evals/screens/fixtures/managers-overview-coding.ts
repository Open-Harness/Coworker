import type { ManagerOverview } from "~/modules/views-manager/types.ts";
import { at } from "./read.ts";
import { head, NOW, sixTiles, tile } from "./managers-kit.ts";

/* Coding's overview, as drawn: 20 fixes a week that stay fixed, 18 now, on its line. The newest week is 11 Nov, a fix counts 14 days later. */

const WEEKS = ["26 Aug", "2 Sep", "9 Sep", "16 Sep", "23 Sep", "30 Sep", "7 Oct", "14 Oct", "21 Oct", "28 Oct", "4 Nov", "11 Nov"];
const RESULT = [8, 10, 9, 9, 10, 12, 13, 14, 15, 16, 17, 18];
/** From 9 to 20 over 11 weeks, from the week of 16 Sep. Before it the line is not drawn (`since`). */
const LINE = RESULT.map((value, i) => (i < 3 ? value : Number((9 + (11 * (i - 3)) / 11).toFixed(1))));
const WAIT_DAYS = [5.4, 5, 5.2, 4.6, 4.1, 3.6, 3.2, 2.9, 2.4, 2.1, 1.9, 1.8];
const PEOPLE_MIN = [55, 55, 55, 48, 40, 33, 28, 25, 20, 18, 15, 14];
const UNDONE = [7, 8, 6, 7, 6, 7, 5, 5, 4, 5, 4, 4];

export const CODING: ManagerOverview = {
  head: head("coding"),
  said: "Bugs people report should get fixed, stay fixed, and not eat Chidi’s week.",
  says: "20 fixes a week that stay fixed, by 30 November",
  by: { person: "Chidi Okafor", at: at("14 Sep 12:00") },
  standing: {
    _tag: "Read",
    now: 18,
    aim: 20,
    line: 18.5,
    is: "on its line",
    since: at("14 Sep 12:00"),
    before: 9,
    points: WEEKS.map((week, i) => ({ at: at(`${week} 12:00`), value: RESULT[i] ?? 0, line: LINE[i] ?? 0 })),
  },
  unit: "Fixes that stayed",
  brought: [
    { kind: "Bugs", points: [4, 5, 5, 4, 5, 6, 7, 7, 8, 8, 9, 10] },
    { kind: "Features", points: [2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3] },
    { kind: "Upkeep", points: [2, 3, 2, 3, 3, 4, 4, 4, 4, 5, 5, 5] },
  ],
  measures: [
    {
      counts: "Closed by a merged change, not reopened or undone for 14 days",
      read: "GitHub, closed and merged by people",
      tile: tile("fixes", "Fixes that stayed, a week", 18, "count", { change: 0.06, points: RESULT }),
      is: "good",
      role: "result",
      before: { value: 9, note: null },
      aim: { value: 20, by: at("30 Nov 12:00"), limit: "at least", note: null },
      per: "week",
      notYet: null,
    },
    {
      counts: "From the issue to the release with the fix",
      read: "GitHub",
      tile: tile("wait", "Wait of who reported it", 43.2, "hours", {
        better: "less",
        change: -0.05,
        points: WAIT_DAYS.map((days) => days * 24),
      }),
      is: "good",
      role: "result",
      before: { value: 124.8, note: null },
      aim: { value: 48, by: null, limit: "under", note: null },
      per: null,
      notYet: null,
    },
    {
      counts: "Reviews and answers, until the merge",
      read: "GitHub reviews and the asks answered",
      tile: tile("people", "A person’s time per fix", 14 / 60, "hours", { better: "less", points: PEOPLE_MIN.map((m) => m / 60) }),
      is: "good",
      role: "guard",
      before: { value: 55 / 60, note: "their guess" },
      aim: { value: 20 / 60, by: null, limit: "under", note: null },
      per: null,
      notYet: null,
    },
    {
      counts: "Reverted, or the issue opened again",
      read: "GitHub",
      tile: tile("undone", "Undone in 14 days", 0.04, "share", { better: "less", points: UNDONE.map((n) => n / 100) }),
      is: "good",
      role: "guard",
      before: { value: 0.07, note: null },
      aim: { value: 0.1, by: null, limit: "under", note: null },
      per: null,
      notYet: null,
    },
    {
      counts: "Errors people meet, per 1,000 visits",
      read: "Sentry",
      tile: tile("users", "Seen by users", null, "count", { better: "less" }),
      is: "not yet",
      role: "result",
      before: { value: null, note: "Unknown" },
      aim: { value: null, by: null, limit: null, note: "Fewer errors" },
      per: null,
      notYet: { from: at("1 Dec 12:00"), why: "from 1 Dec: it waits for a yes to connect" },
    },
    {
      counts: "Models and machines, all of Coding",
      read: "The bill",
      tile: tile("cost", "Cost per fix", 7.8, "dollars", { better: "less" }),
      is: "good",
      role: "guard",
      before: { value: null, note: "None" },
      aim: { value: 20, by: null, limit: "under", note: null },
      per: null,
      notYet: null,
    },
  ],
  worse: [
    { counts: "A person’s time per fix", now: 14 / 60, limit: 20 / 60, is: "fine" },
    { counts: "Undone in 14 days", now: 0.04, limit: 0.1, is: "fine" },
    { counts: "Cost per fix", now: 7.8, limit: 20, is: "fine" },
  ],
  lost: {
    steps: [
      { name: "came in", in: 86, on: 24 },
      { name: "taken on", in: 24, on: 19 },
      { name: "merged", in: 19, on: 18 },
      { name: "stayed fixed", in: 18, on: 18 },
    ],
    most: "came in",
  },
  lostWhy: [
    {
      because: [
        { n: 31, what: "the same as another" },
        { n: 19, what: "for Support" },
        { n: 12, what: "not for us" },
      ],
      change: null,
    },
    {
      because: [
        { n: 2, what: "wait for a review" },
        { n: 3, what: "days the longest" },
      ],
      change: "Ask a second reviewer after one day",
    },
    { because: [{ n: 1, what: "in 9 came back once before the merge" }], change: null },
    { because: [{ n: 2, what: "weeks on" }], change: null },
  ],
  readAt: NOW,
  tiles: sixTiles("coding"),
  tilesNotYet: [],
  connectors: [
    { id: "github", name: "GitHub", as: "acme/web", works: true, says: "Connected", in: 86, out: 61 },
    { id: "slack", name: "Slack", as: "acme.slack.com", works: true, says: "Connected", in: 12, out: 9 },
  ],
  rail: [
    {
      tone: "waits",
      title: "Drop Node 18",
      text: "ACME-398 · Waits for your answer",
      link: "/m/coding/work/ACME-398",
      for: "ama",
      since: at("22 Nov 09:54"),
    },
    {
      tone: "waits",
      title: "Rate limit on the public API",
      text: "ACME-404 · Waits for Chidi’s review",
      link: "/m/coding/work/ACME-404",
      for: "chidi",
      since: at("23 Nov 09:54"),
    },
    {
      tone: "plain",
      title: "Timezone off by one in reports",
      text: "ACME-411 · Merged, and Support told the two customers",
      link: "/m/coding/work/ACME-411",
      for: null,
      since: at("25 Nov 05:54"),
    },
    {
      tone: "plain",
      title: "Support for Internet Explorer",
      text: "ACME-406 · Closed as no, with the reason",
      link: "/m/coding/work/ACME-406",
      for: null,
      since: at("24 Nov 09:54"),
    },
  ],
};
