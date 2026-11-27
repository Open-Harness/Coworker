import type { Thing } from "orthograph";
import { Playbook, Work, workMachine } from "@coworker/blueprint";
import { proposal } from "./proposal.ts";

export const D1 = proposal({
  id: "D1",
  name: "A machine whose states are read from data",
  what:
    "A field of a thing whose allowed values are another thing's data, not a fixed list: a piece of work's step is one of " +
    "its kind's steps, as its playbook says at the version the work was taken on.",
  why:
    "Each kind of work has its own steps, and they are the board's columns (spec W4; inventory, question 1). Orthograph's " +
    "machine has fixed states, and K11 makes the column the state, so `work.move` has no `move:` and nothing checks the step.",
  where:
    "packages/orthograph/src/modules/machines: a `Blueprint.steps` beside `Blueprint.machine`. The compiler checks that an " +
    "operation that names it writes only that field; the generated handler gets `steps.allowed(work)` from the source.",
  waits: ["things/work/verbs/move.ts", "things/work/errors.ts (StepNotInKind)"],
});

/** The smallest declaration: which field, read from where, and while the thing is in which states. */
export interface Steps<T extends Thing = Thing> {
  readonly kind: "steps";
  readonly thing: T;
  readonly field: keyof T["fields"] & string;
  /** The thing and the path in it that lists the values, keyed by the instance's own fields. */
  readonly from: { readonly thing: Thing; readonly path: string; readonly at: ReadonlyArray<keyof T["fields"] & string> };
  /** The machine states in which the field may move. */
  readonly while: ReadonlyArray<string>;
}

export const steps = <T extends Thing>(thing: T, spec: Omit<Steps<T>, "kind" | "thing">): Steps<T> => ({ kind: "steps", thing, ...spec });

// Co-worker's one use: `work.move` would then say `move: workSteps`, and refuse a step not in the kind with `WorkNotInStep`.
export const workSteps = steps(Work, {
  field: "step",
  from: { thing: Playbook, path: "files.workflow.kinds[kind].steps", at: ["manager", "version", "kind"] },
  while: [workMachine.states.open.key, workMachine.states.waiting.key],
});
