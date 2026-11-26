import type { TriggerView } from "~/modules/views-manager/types.ts";
import { trigger } from "./managers-sales-kit.ts";
import { at, read, type Fixture } from "./read.ts";

/* Sales' "Look for signs": a search that runs on weekdays at 08:30, and what it found in 7 days. */

const RUNS: readonly (readonly [string, string, number])[] = [
  ["25 Nov 08:30", "140 read, 1 found, 4 minutes", 0.6],
  ["24 Nov 08:30", "140 read, 1 found, 5 minutes", 0.62],
  ["23 Nov 08:30", "140 read, 1 found, 6 minutes", 0.65],
  ["20 Nov 08:30", "140 read, 2 found, 5 minutes", 0.6],
  ["19 Nov 08:30", "138 read, 1 found, 2 sites did not answer", 0.52],
];

const FOUND: TriggerView["found"] = [
  {
    title: "Harbor Foods",
    says: "Opened a site in Ghent, 19 Nov",
    from: "Read on harborfoods.example/news",
    became: "Waits for Bo",
    at: at("25 Nov 08:34"),
    waits: true,
  },
  {
    title: "Orbit Labs",
    says: "Raised money, 20 Nov",
    from: "Read in a trade paper",
    became: "Left alone",
    at: at("24 Nov 08:36"),
    waits: false,
  },
  {
    title: "Lindqvist Paper",
    says: "First head of operations, 17 Nov",
    from: "Read on its own page",
    became: "SALES-33",
    at: at("23 Nov 08:32"),
    waits: false,
  },
  {
    title: "Tern Hotels",
    says: "Opened two sites, 12 Nov",
    from: "Read on its own page",
    became: "SALES-27",
    at: at("20 Nov 08:35"),
    waits: false,
  },
  {
    title: "Abbot Glass",
    says: "First head of operations, 9 Nov",
    from: "Read on its own page",
    became: "SALES-26",
    at: at("20 Nov 08:35"),
    waits: false,
  },
  {
    title: "Moss & Reed",
    says: "Opened a site in Porto, 11 Nov",
    from: "Read in a local paper",
    became: "SALES-25",
    at: at("19 Nov 08:33"),
    waits: false,
  },
];

export const SALES_SIGNS: Fixture = read(
  "/m/:manager/triggers/:trigger",
  { manager: "sales", trigger: "signs" },
  {
    row: trigger("signs"),
    agentName: "Researcher",
    kindName: "A sign at a company",
    looksAt: { says: "CRM list “Target accounts”", count: 140, noun: "companies" },
    may: {
      grants: [
        { account: "web", place: "*", may: { "web.read": "on" } },
        { account: "crm", place: "*", may: { "crm.read": "on" } },
      ],
      limits: {},
    },
    spent: { month: 11, of: 25 },
    steps: [
      { does: "Read the list", by: "Sales", says: "Target accounts, as it is in the CRM now" },
      {
        does: "Read what is new about each",
        by: "Researcher, 10 at a time",
        says: "Its own site, trade papers, job pages. Only what changed since last time",
      },
      { does: "Keep only signs with a date and a source", by: "Researcher", says: "What has no date is left out" },
      { does: "Check each against the CRM", by: "Sales", says: "Not a customer, not an open deal, not the same sign again" },
      { does: "Put each in Intake", by: "Sales", says: "At most 10. The rest wait for tomorrow" },
    ],
    found: FOUND,
    runs: RUNS.map(([when, says, cost]) => ({ at: at(when), says, cost })),
    triedDays: 30,
    tried: [
      { when: "Every hour", says: "22 found, the same day, $78" },
      { when: "Weekdays", says: "22 found, the same day, $13" },
      { when: "Mondays", says: "13 found, 4 days late, $3" },
    ],
  },
);
