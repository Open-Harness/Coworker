import { intake } from "~/modules/intake/service.ts";
import type { Decision, Hears, Item, OpenWork } from "~/modules/intake/types.ts";
import type { AskRule } from "~/modules/playbook/types.ts";
import type { Chosen } from "../types.ts";

/* When two fit equally a person is asked which, and the one they chose takes it: what they said is a person's word, never a model's. */

/** The place says that this person may ask: they are the team's, and what they chose is what they asked for. */
const THEIRS = (item: Item): AskRule => ({
  account: item.account,
  place: "*",
  listed: { who: "team" },
  bots: [],
  overheard: "no",
  others: "no",
});

export function decideChosen(item: Item, hears: readonly Hears[], open: readonly OpenWork[], chosen: Chosen, now: number): Decision {
  if (chosen.manager === "")
    return { _tag: "Left", item: item.id, gated: [], verdicts: [], why: `${chosen.name} said to leave it, so it is left.` };
  const asked: Item = {
    ...item,
    addressed: true,
    by: "asked",
    actor: { address: chosen.by, name: chosen.name, bot: false, person: chosen.by },
  };
  const theirs = hears.map((one) => ({ ...one, mayAsk: [THEIRS(item)] }));
  const verdicts = [{ manager: chosen.manager, kind: chosen.kind, is: true, why: `${chosen.name} chose it`, fit: 1 }];
  const decision = intake.decide({ item: asked, hears: theirs, open, judgement: { _tag: "Judged", judged: { verdicts } }, now });
  const named = hears.find((one) => one.manager === chosen.manager)?.name ?? chosen.manager;
  return decision._tag === "Took" ? { ...decision, why: `${chosen.name} said ${named} takes it, so it does.` } : decision;
}
