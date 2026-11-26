import type { ManagerOverview } from "~/modules/views-manager/types.ts";
import { at } from "./read.ts";
import { head, NOW, sixTiles, tile } from "./managers-kit.ts";

/* Sales' overview, as drawn: 12 good calls a week by 31 December, 9 now, on its line. */

const WEEKS = ["9 Sep", "16 Sep", "23 Sep", "30 Sep", "7 Oct", "14 Oct", "21 Oct", "28 Oct", "4 Nov", "11 Nov", "18 Nov", "25 Nov"];
const RESULT = [5, 4, 6, 5, 5, 5, 6, 7, 8, 8, 8, 9];
/** The straight line from 5 to 12, from the week of 7 Oct to the end. Before it, the line is not drawn (`since`). */
const LINE = RESULT.map((value, i) => (i < 4 ? value : Number((5 + (7 * (i - 4)) / 12).toFixed(1))));
const WAIT = [26, 25, 27, 24, 26, 6, 3, 1.2, 0.6, 0.4, 0.2, 0.2];
const BO = [17, 17, 17, 17, 17, 9, 7, 6, 5, 4, 4, 3].map((minutes) => minutes / 60);

export const SALES: ManagerOverview = {
  head: head("sales"),
  said: "I want more good calls. Bo loses leads because nobody follows up, and we hear too late when a company changes. Twelve a week by new year, and not at the cost of Bo’s day.",
  says: "12 good calls a week by 31 December",
  by: { person: "Ama Mensah", at: at("5 Oct 12:00") },
  standing: {
    _tag: "Read",
    now: 9,
    aim: 12,
    line: 9.1,
    is: "on its line",
    since: at("5 Oct 12:00"),
    before: 5,
    points: WEEKS.map((week, i) => ({ at: at(`${week} 12:00`), value: RESULT[i] ?? 0, line: LINE[i] ?? 0 })),
  },
  unit: "Good calls",
  brought: [
    { kind: "Someone asked", points: [4, 4, 5, 4, 4, 4, 4, 4, 5, 4, 4, 4] },
    { kind: "A sign at a company", points: [1, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 4] },
    { kind: "A lead that went quiet", points: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1] },
  ],
  measures: [
    {
      counts: "Took place, with a company that fits",
      read: "CRM, set by Bo after the call",
      tile: tile("calls", "Good calls a week", 9, "count", { change: 0.125, points: RESULT }),
      is: "good",
      role: "result",
      before: { value: 5, note: null },
      aim: { value: 12, by: at("31 Dec 12:00"), limit: "at least", note: null },
      per: "week",
      notYet: null,
    },
    {
      counts: "Deals won whose first call it brought, and their value",
      read: "CRM",
      tile: tile("won", "Won from those calls", null, "count"),
      is: "not yet",
      role: "result",
      before: { value: 4, note: null },
      aim: { value: 8, by: null, limit: "at least", note: null },
      per: "month",
      notYet: { from: at("4 Dec 12:00"), why: "A deal takes about 60 days, so the first on 4 Dec" },
    },
    {
      counts: "From their mail to our first answer, the usual one",
      read: "Mail, both times by the server",
      tile: tile("wait", "Wait for a first answer", 11 / 60, "hours", { better: "less", change: 0, points: WAIT }),
      is: "good",
      role: "result",
      before: { value: 26, note: null },
      aim: { value: 1, by: null, limit: "under", note: null },
      per: null,
      notYet: null,
    },
    {
      counts: "Open and answering what it asks, not the call",
      read: "The asks Bo answered",
      tile: tile("bo", "Bo’s time per good call", 0.05, "hours", { better: "less", points: BO }),
      is: "good",
      role: "guard",
      before: { value: 17 / 60, note: "Bo’s guess" },
      aim: { value: 10 / 60, by: null, limit: "under", note: null },
      per: null,
      notYet: null,
    },
    {
      counts: "Asked us not to write again, 30 days",
      read: "Mail, checked by Bo",
      tile: tile("stop", "People who said stop", 1, "of", { of: 96, better: "less" }),
      is: "good",
      role: "guard",
      before: { value: null, note: "Unknown" },
      aim: { value: 3, by: null, limit: "under", note: "in 100" },
      per: null,
      notYet: null,
    },
    {
      counts: "Models and searches, all of Sales",
      read: "The bill",
      tile: tile("cost", "Cost per good call", 5.8, "dollars", { better: "less" }),
      is: "good",
      role: "guard",
      before: { value: null, note: "None" },
      aim: { value: 15, by: null, limit: "under", note: null },
      per: null,
      notYet: null,
    },
  ],
  worse: [
    { counts: "Bo’s time per good call", now: 0.05, limit: 10 / 60, is: "fine" },
    { counts: "People who said stop", now: 1, limit: 3, is: "fine" },
    { counts: "Cost per good call", now: 5.8, limit: 15, is: "fine" },
  ],
  lost: {
    steps: [
      { name: "came in", in: 41, on: 33 },
      { name: "taken on", in: 33, on: 12 },
      { name: "booked", in: 12, on: 9 },
      { name: "good calls", in: 9, on: 9 },
    ],
    most: "came in",
  },
  lostWhy: [
    {
      because: [
        { n: 5, what: "only watched" },
        { n: 2, what: "left alone" },
        { n: 1, what: "waits for Bo" },
      ],
      change: "Find companies like our best: from Watch to Ask",
    },
    {
      because: [
        { n: 21, what: "are still open" },
        { n: 9, what: "of them wait for the customer" },
      ],
      change: null,
    },
    {
      because: [
        { n: 2, what: "did not come" },
        { n: 1, what: "was too small" },
      ],
      change: "One reminder the day before the call",
    },
    { because: [], change: null },
  ],
  readAt: NOW,
  tiles: sixTiles("sales"),
  tilesNotYet: [],
  connectors: [
    { id: "email", name: "Email", as: "juno@acme.co-worker.tech", works: true, says: "Connected", in: 14, out: 12 },
    { id: "crm", name: "CRM", as: "Acme’s CRM", works: true, says: "Connected", in: 9, out: 3 },
    { id: "calendar", name: "Calendar", as: "Bo’s calendar", works: true, says: "Connected", in: 2, out: 4 },
    { id: "slack", name: "Slack", as: "acme.slack.com", works: true, says: "Connected", in: 2, out: 1 },
  ],
  rail: [
    {
      tone: "waits",
      title: "Harbor Foods opened a site in Ghent",
      text: "Write to its head of operations?",
      link: "/m/sales/intake",
      for: "bo",
      since: at("25 Nov 08:52"),
    },
  ],
};
