import type { Kind, Step } from "~/modules/playbook/types.ts";
import type { Evidence, Work } from "../types.ts";
import { sameJson } from "./same.ts";
import { indexOfStep } from "./steps.ts";

/** A doer is an agent with a thread of role `does`, by thread id or by agent id. */
export function byDoer(work: Work, by: Evidence["by"]): boolean {
  if (!("agent" in by)) return false;
  return work.threads.some((t) => t.role === "does" && (t.id === by.thread || t.agent === by.agent));
}

export function hasEvidence(work: Work, item: Evidence): boolean {
  return work.evidence.some((seen) => sameJson(seen, item));
}

/** Evidence is never added twice. */
export function addEvidence(work: Work, items: readonly Evidence[]): Work {
  const fresh = items.filter((item, i) => !hasEvidence(work, item) && !items.slice(0, i).some((x) => sameJson(x, item)));
  return fresh.length === 0 ? work : { ...work, evidence: [...work.evidence, ...fresh] };
}

/** The last word on a check from someone who did not do the work. */
export function lastOthers(work: Work, check: string): Evidence | undefined {
  for (let i = work.evidence.length - 1; i >= 0; i -= 1) {
    const item = work.evidence[i];
    if (item !== undefined && item.check === check && !byDoer(work, item.by)) return item;
  }
  return undefined;
}

export function isDone(work: Work): boolean {
  const checks = work.doneWhen;
  if (checks === null || checks.length === 0) return false;
  return checks.every((check) => lastOthers(work, check.id)?.met === true);
}

/** Each of its leaves is shown, by someone else. A step with no leaves is never left by evidence. */
export function leavesMet(work: Work, step: Step): boolean {
  return step.leaves.length > 0 && step.leaves.every((leave) => lastOthers(work, leave.id)?.met === true);
}

/** Sent back: nothing shown before counts for the step, those after it, or what agents showed of done when. What was there stays. */
export function forget(work: Work, kind: Kind, target: Step, at: number): Work {
  const from = Math.max(indexOfStep(kind, target.id), 0);
  const ids = [
    ...kind.steps.slice(from).flatMap((step) => step.leaves.map((leave) => leave.id)),
    ...(work.doneWhen ?? []).filter((check) => check.by === "agent").map((check) => check.id),
  ];
  const undone = [...new Set(ids)]
    .filter((id) => lastOthers(work, id)?.met === true)
    .map((id): Evidence => ({
      check: id,
      met: false,
      says: `It was sent back to ${target.name}, so ${id} has to be shown again.`,
      by: { code: true },
      at,
    }));
  return undone.length === 0 ? work : { ...work, evidence: [...work.evidence, ...undone] };
}
