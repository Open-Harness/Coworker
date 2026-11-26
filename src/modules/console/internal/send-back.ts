import { intake } from "~/modules/intake/service.ts";
import type { Decision } from "~/modules/intake/types.ts";
import { playbooks } from "~/modules/playbook/service.ts";
import type { ConsoleDeps } from "../types.ts";
import { didOf } from "./manager-views.ts";
import type { Open } from "./managers.ts";

/* Wrong twice in a row for a kind, and the kind goes back a step: `do` to `ask`, `ask` to `watch` (spec I8). It is a version, so it can be gone back from. */

/** The kind a decision was about, for the manager: the one that took it, or the one the judge said yes to and was left. */
export function kindOfDecision(decision: Decision, manager: string): string | undefined {
  if (decision._tag === "Took") return decision.manager === manager ? decision.kind : undefined;
  if (decision._tag === "Left") return decision.would?.manager === manager ? decision.would.kind : undefined;
  if (decision._tag === "Asked") return decision.between.find((one) => one.manager === manager)?.kind;
  return undefined;
}

/** Whether a person's word agrees with what intake did: a `Left` that carries `would` was the judge's yes, so "left" disagrees with it. */
export const agreed = (should: string, decision: Decision): boolean => should === didOf(decision);

/** The kind goes back a step when its last two corrections were both wrong. Answers the new version's number, or nothing. */
export async function sendBack(c: ConsoleDeps, open: Open, kind: string): Promise<number | undefined> {
  const manager = open.row.node.id;
  const corrections = ((await c.store.kept("correction")) as readonly { manager: string; item: string; should: string; at: number }[])
    .filter((one) => one.manager === manager)
    .toSorted((a, b) => a.at - b.at);
  const { rows } = await c.store.items(manager, { from: null, before: null, limit: 500 });
  const said = corrections.flatMap((one) => {
    const row = rows.find((found) => found.item.id === one.item);
    if (row?.decision === null || row === undefined || kindOfDecision(row.decision, manager) !== kind) return [];
    return [agreed(one.should, row.decision) ? ("right" as const) : ("wrong" as const)];
  });
  const latest = (await open.store.version()) ?? open.version;
  const read = playbooks.read(latest.files);
  if (read._tag === "Problems") return undefined;
  const was = read.playbook.kinds.find(({ id }) => id === kind);
  if (was === undefined) return undefined;
  const now = intake.afterCorrection(was.alone, said);
  if (now === was.alone) return undefined;
  const kinds = read.playbook.kinds.map((one) => (one.id === kind ? { ...one, alone: now } : one));
  const saved = await open.store.save({
    files: playbooks.write({ ...read.playbook, kinds }),
    by: c.who.id,
    at: c.clock.now(),
    says: `${was.name} goes back from ${was.alone} to ${now}: it was wrong twice in a row.`,
    from: "edited",
  });
  return saved.number;
}
