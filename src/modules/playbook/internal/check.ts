import type { Playbook, Problem, Surroundings } from "../types.ts";
import { contextOf } from "./check-context.ts";
import { checkAgents, checkObjective, checkSkills, checkTriggers } from "./check-parts.ts";
import { checkReach } from "./check-reach.ts";
import { checkBecause, checkEvals, checkPage } from "./check-wanted.ts";
import { checkKinds } from "./check-workflow.ts";

/** What code can say about a playbook, all of it at once. Nothing: it can be made. */
export function checkPlaybook(p: Playbook, around: Surroundings): readonly Problem[] {
  const found: Problem[] = [];
  const c = contextOf(p, around, found);
  checkPage(c);
  checkObjective(c);
  checkKinds(c);
  checkTriggers(c);
  checkAgents(c);
  checkSkills(c);
  checkReach(c);
  checkEvals(c);
  checkBecause(c);
  return found;
}
