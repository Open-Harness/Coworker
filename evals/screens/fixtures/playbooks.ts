import type { CaseRun } from "~/modules/trials/types.ts";
import { at, read, type Fixture } from "./read.ts";
import { salesView } from "./sales-playbook.ts";
import { EVALS } from "./sales-evals.ts";

/* Sales's playbook as it runs (version 6), the versions it has had, and version 6 beside the proposed 7. */

const SALES = { manager: "sales" };

const VERSIONS = [
  [6, "Signs: not a single job advert", "Ama", "from 3 corrections", "23 Nov", "edited", 3, "2 open pieces were told"],
  [5, "A lead that went quiet: ask to do", "Bo", "proposed by Juno", "16 Nov", "suggestion", 1, "None was affected"],
  [4, "Ama and Bo may ask in Slack #sales", "Ama", null, "9 Nov", "edited", 1, "None was affected"],
  [3, "Never write to a private address it found", "Bo", "after one mail", "2 Nov", "edited", 1, "1 open piece was stopped"],
  [2, "A company like our best: in a country we sell to", "Ama", "from 4 corrections", "19 Oct", "edited", 4, "None was affected"],
  [1, "Set up, from the draft", "Juno", "Ama said yes", "5 Oct", "made", 0, "The first"],
] as const;

/** The six cases, of the 28, where version 7 does something else than 6. */
const DIFFER = [
  [
    "d1",
    "Vanna Linen put up a page for a new range",
    "Counted it as a new site, and wrote. No answer.",
    "Left it alone: a page, not a site at its own address.",
  ],
  [
    "d2",
    "Brightside Print put up a spring page",
    "Counted it as a new site, and asked Bo. Bo said no.",
    "Left it alone, and kept it as a case.",
  ],
  [
    "d3",
    "Rowan Tools put up a news page",
    "Counted it as a new site, and wrote. A reply: wrong person.",
    "Left it alone: a page, not a site at its own address.",
  ],
  [
    "d4",
    "Holm & Daughters put up a sale page",
    "Counted it as a new site, and wrote. No answer.",
    "Left it alone: a page, not a site at its own address.",
  ],
  [
    "d5",
    "Fenwick Cycles put up a jobs page",
    "Counted it as a new site, and asked Bo. Bo said no.",
    "Left it alone, and kept it as a case.",
  ],
  [
    "d6",
    "Marlow Paints put up a gallery page",
    "Counted it as a new site, and wrote. No answer.",
    "Left it alone: a page, not a site at its own address.",
  ],
] as const;

const run = (id: string, version: CaseRun["version"], says: string): CaseRun => ({
  case: id,
  version,
  time: at("25 Nov 09:20"),
  passed: version === "next",
  says,
  cost: version === "now" ? 0.45 : 0,
});

const signs = EVALS.find((one) => one.id === "signs");
if (signs === undefined) throw new Error("Sales has no eval of its signs");

export const PLAYBOOKS: readonly Fixture[] = [
  read("/m/:manager/playbook?version", SALES, salesView("live")),
  read("/m/:manager/versions", SALES, {
    versions: VERSIONS.map(([number, says, by, how, when, from, changes, told]) => ({
      number,
      says,
      by,
      how,
      at: at(`${when} 09:00`),
      from,
      changes,
      told,
    })),
  }),
  read(
    "/m/:manager/compare/:trial",
    { ...SALES, trial: "signs" },
    {
      trial: {
        id: "signs",
        of: "triggers/signs",
        says: "A new site at its own address",
        changes: [{ line: "triggers/signs", was: "A new site.", becomes: "A new site at its own address." }],
        now: { passed: 19, of: 28, cost: 13, spread: 0.02 },
        next: { passed: 19, of: 22, cost: 11, spread: 0.02 },
        differ: DIFFER.map(([id, , six, seven]) => ({ case: id, now: run(id, "now", six), next: run(id, "next", seven) })),
        worse: [],
      },
      of: { id: signs.id, ...signs.eval },
      names: { now: "Version 6", next: "Version 7" },
      cases: DIFFER.map(([id, what]) => ({ id, what })),
      asks: { person: "Ama", why: "it changes what counts as a sign" },
      minutes: { now: 18, next: 17 },
      guards: [
        { counts: "Bo’s minutes per good call", unit: "minutes", now: 9, next: 9, limit: 10 },
        { counts: "Who say stop, of 100", unit: "in 100", now: 2, next: 2, limit: 3 },
        { counts: "Cost per good call", unit: "dollars", now: 5.8, next: 5.4, limit: 15 },
      ],
    },
  ),
];
