import type { WalkStep } from "~/modules/doings/types.ts";
import { write, type Fixture } from "./read.ts";
import { TEMPLATE_READS, TEMPLATE_WRITES } from "./making-templates.ts";
import { ONWARD, WALKS } from "./making-walks.ts";

/* Making a manager: the templates and their blanks, the walkthrough, and the co-worker showing how it would change a trigger. */

export const MAKING: readonly Fixture[] = [...TEMPLATE_READS, ...WALKS];

const PAGE = "/m/sales/playbook/triggers";
export const SAVE = "Save as version 7";
/**
 * What the co-worker would do to change when Look for signs runs, in order, without doing it (`trigger.edit`, then `version.save`).
 * The last step is the person's: it stops before saving, and only a person goes on.
 */
export const WALK: readonly WalkStep[] = [
  {
    say: "Signs are looked for by a trigger, so I go to Sales, Playbook, Triggers.",
    at: { page: PAGE, press: null },
    does: "go",
    yours: false,
  },
  {
    say: "Look for signs runs every weekday, so Mondays too. This is its pencil.",
    at: { page: PAGE, press: "Edit Look for signs" },
    does: "point",
    yours: false,
  },
  { say: "I press it to edit the trigger.", at: { page: PAGE, press: "Edit Look for signs" }, does: "press", yours: false },
  {
    say: "I change When from Weekdays to Tuesday to Friday. The time stays.",
    at: { page: PAGE, press: "When" },
    does: "fill",
    field: "When",
    value: "Tuesday to Friday, 08:30",
    yours: false,
  },
  {
    say: "I leave the rest as it is: what happens, only when, at most.",
    at: { page: PAGE, press: "What happens" },
    does: "point",
    yours: false,
  },
  { say: "I press Keep.", at: { page: PAGE, press: "Keep" }, does: "press", yours: false },
  {
    say: "I stop before Save as version 7. 4 runs a week instead of 5. Monday’s signs are found on Tuesday, so nothing is lost. About $0.60 less a week. Shall I save it?",
    at: { page: PAGE, press: SAVE },
    does: "press",
    yours: true,
  },
];

export const MAKING_WRITES: readonly Fixture[] = [
  ...TEMPLATE_WRITES,
  write("/walk", {}, { steps: WALK }),
  write("/set-up", {}, { walk: "at-ask" }),
  ...Object.entries(ONWARD).map(([walk, view]) => write("/set-up/:walk", { walk }, view)),
];
