import type { Objective } from "~/modules/playbook/types.ts";

function words(text: string): readonly string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .filter((word) => word !== "");
}

/** Why this may not be a measure: the manager may write, on the account it reads, a field the query names. */
export function mayBe(objective: Objective, mayWrite: readonly { readonly account: string; readonly field: string }[]): string | null {
  const { read } = objective.measure;
  if (read.from !== "connector") return null;
  const inQuery = words(read.query);
  const clash = mayWrite.find((w) => w.account === read.account && inQuery.includes(w.field.toLowerCase()));
  if (!clash) return null;
  return `The manager may write ${clash.field} on ${clash.account}, and that is what this reads, so it could change its own number.`;
}
