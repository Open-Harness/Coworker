import type { Change } from "~/modules/playbook/types.ts";

const ALONE: readonly RegExp[] = [/^page$/u, /^page\/[^]+$/u, /^agents\/[^/]+\/(?:told|model)$/u, /^skills\/[^/]+$/u];

function isAlone(line: string): boolean {
  if (line.split("/").some((part) => part === "." || part === "..")) return false;
  return ALONE.some((pattern) => pattern.test(line));
}

/** Words, skills and models are the co-worker's own; steps, reach, evals and the objective are asked. All or none. */
export function mayAlone(changes: readonly Change[]): boolean {
  return changes.every((change) => isAlone(change.line));
}
