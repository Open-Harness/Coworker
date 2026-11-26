import type { Kind, Step } from "~/modules/playbook/types.ts";
import type { Work } from "../types.ts";

export function stepOf(kind: Kind, work: Work): Step | undefined {
  return kind.steps.find((step) => step.id === work.step);
}

/** -1 for a step the kind does not have (triage, done). */
export function indexOfStep(kind: Kind, id: string): number {
  return kind.steps.findIndex((step) => step.id === id);
}

/**
 * A step by an agent whose leaves are not empty and all shown by agents: someone fresh looks, and nothing is done in it. Not when
 * another agent is named to check it (`checkedBy`): then the step's own agent does, and that one looks.
 */
export function isChecking(step: Step): boolean {
  const another = "agent" in step.checkedBy && "agent" in step.by && step.checkedBy.agent !== step.by.agent;
  return "agent" in step.by && !another && step.leaves.length > 0 && step.leaves.every((leave) => leave.by === "agent");
}

/** The agent that does the work before a step: the last doing step before it. The manager's own hands. */
export function doerAgentBefore(kind: Kind, step: Step): string | undefined {
  for (let i = indexOfStep(kind, step.id) - 1; i >= 0; i -= 1) {
    const before = kind.steps[i];
    if (before !== undefined && "agent" in before.by && !isChecking(before)) return before.by.agent;
  }
  return undefined;
}
