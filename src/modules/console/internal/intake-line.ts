import type { Decision, Item } from "~/modules/intake/types.ts";
import type { IntakeRow } from "~/modules/views-manager/types.ts";

/* What became of an item, step by step: found, let through, judged, and what was done with it. */

const LET = { asked: "Let through: it asked", maybe: "Let through on watch", no: "Not let through" } as const;

/** What was done at the end, in a sentence. */
const endOf = (decision: Decision): string =>
  decision._tag === "Took"
    ? `Taken on as ${decision.kind}`
    : decision._tag === "Joined"
      ? "Joined work that is open"
      : decision._tag === "Left"
        ? "Left"
        : decision._tag === "Asked"
          ? "Asked a person which"
          : decision._tag === "Stopped"
            ? "Stopped the work"
            : "Could not tell";

export function lineOf(item: Item, decision: Decision): IntakeRow["line"] {
  const at = item.at;
  const gates = decision.gated.map(({ gated }) => ({ did: "Let through", says: `${LET[gated.let]}: ${gated.why}`, at }));
  const yes = decision.verdicts.filter((one) => one.is).length;
  const judged =
    decision.verdicts.length === 0
      ? []
      : [{ did: "Judged", says: `${yes} of ${decision.verdicts.length} kinds fit`, at }];
  return [
    { did: "Found", says: `${item.actor.name} on ${item.place}`, at },
    ...gates,
    ...judged,
    { did: "Decided", says: `${endOf(decision)}: ${decision.why}`, at },
  ];
}
