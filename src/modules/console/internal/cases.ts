import type { Decision, Item } from "~/modules/intake/types.ts";
import type { Line } from "~/modules/playbook/types.ts";
import { trials } from "~/modules/trials/service.ts";
import type { Case } from "~/modules/trials/types.ts";
import type { ConsoleDeps } from "../types.ts";

/* The cases of a part: what people put right, with what it should have been. Nothing is kept twice: they are made of corrections and decisions. */

export interface JudgeCase {
  readonly case: Case;
  /** What intake should have done: took, left or asked. */
  readonly should: string;
  readonly item: Item;
}

/** The part of the playbook that a line is of: the eval that is about it. */
export function partOf(line: Line): Line {
  const parts = line.split("/");
  if (parts[0] === "agents" || parts[0] === "skills") return parts.slice(0, 2).join("/");
  if (parts[0] === "workflow") return parts.slice(0, 3).join("/");
  return "playbook";
}

/** What the judge said of an item for this manager: it is one of its kinds, or it is not. */
export const saidYes = (decision: Decision, manager: string): boolean =>
  decision.verdicts.some((verdict) => verdict.manager === manager && verdict.is);

/** The judge's cases: each correction of an item that was decided, as the case it is: right when the judge said what the person says it should have. */
export async function judgeCases(c: ConsoleDeps, manager: string): Promise<readonly JudgeCase[]> {
  const corrections = (
    (await c.store.kept("correction")) as readonly { manager: string; item: string; should: string; by: string }[]
  ).filter((one) => one.manager === manager);
  const { rows } = await c.store.items(manager, { from: null, before: null, limit: 500 });
  const made: JudgeCase[] = [];
  for (const correction of corrections) {
    const row = rows.find((one) => one.item.id === correction.item);
    if (row?.decision === null || row === undefined) continue;
    const yes = saidYes(row.decision, manager);
    const next = trials.caseOf(
      {
        of: "agents/judge",
        item: row.item.id,
        given: `${row.item.title}\n\n${row.item.text}`.trim(),
        happened: yes
          ? "The judge said it is one of this manager's kinds of work."
          : "The judge said it is none of this manager's kinds of work.",
        right: yes === (correction.should !== "left"),
        saidBy: correction.by,
        from: "live",
      },
      made.map((one) => one.case),
    );
    made.push({ case: next, should: correction.should, item: row.item });
  }
  const held = new Set(trials.held(made.map((one) => one.case)).map((one) => one.id));
  return made.map((one) => ({ ...one, case: { ...one.case, held: held.has(one.case.id) } }));
}
