import type { SetUpView } from "~/modules/views-manager/types.ts";
import type { Stage } from "~/modules/walkthrough/types.ts";

/** Before anything is said there is one step, and these words are the page's own: the others are written by the set-up skill. */
export const startOf = (who: string) =>
  ({
    label: "What you want",
    about: "In your own words.",
    title: "What do you want to get to?",
    lead: `Say it as you would to a colleague. ${who} writes the rest of these steps from it.`,
  }) as const;

/** The seven parts of a playbook, which the draft so far fills in one after the other. */
export const PARTS = ["Objective", "Workflow", "Triggers", "Agents", "Skills", "Reach", "Evals"] as const;

/** What the walk is called: what was said, in its first sentence, without "I want". */
export const titleOf = (said: string): string => {
  const first = (said.split(/(?<=[.!?])\s/u)[0] ?? "")
    .replace(/^I want\s+/iu, "")
    .replace(/[.!?]$/u, "")
    .trim();
  return first === "" ? "New objective" : `${first.charAt(0).toUpperCase()}${first.slice(1)}`;
};

/** Where in the six steps a walk stands. */
const STEP: Readonly<Record<Stage, number>> = {
  said: 0,
  "first questions": 1,
  connect: 2,
  found: 3,
  "second questions": 4,
  draft: 5,
  made: 5,
  "thrown away": 5,
  "carried by another": 5,
};
export const stepOf = (stage: Stage): number => STEP[stage];

/** Who is asked when the draft would ask: the person a guard reads from, else whoever answers for it. */
export const askedOf = (view: SetUpView): string | undefined => {
  const objective = view.walk.objective;
  const read = objective?.notWorse.map((guard) => guard.measure.read).find((one) => one.from === "person");
  return read?.from === "person" ? read.person : objective?.owner;
};
