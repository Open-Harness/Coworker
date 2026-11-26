import type { Decision, DecideInput, Gated, Hears, Item, OpenWork } from "../types.ts";
import { gate, who } from "./gate.ts";
import { saysStop } from "./stop.ts";

type Settle = Omit<DecideInput, "judgement">;
type GatedBy = Decision["gated"];

export function gatedBy(item: Item, hears: readonly Hears[]): GatedBy {
  return hears.map((h) => ({ manager: h.manager, gated: gate(item, h.mayAsk) }));
}

export function letIn(gated: GatedBy, hears: readonly Hears[], manager: string): Gated["let"] | undefined {
  const h = hears.find((x) => x.manager === manager);
  return h === undefined ? undefined : gated.find((g) => g.manager === manager)?.gated.let;
}

function mayStop(item: Item, owner: Hears | undefined): boolean {
  if (owner === undefined || item.by === "cron" || item.by === "wait") return false;
  return gate({ ...item, addressed: true }, owner.mayAsk).let === "asked";
}

function nobodyLetsIn(item: Item, hears: readonly Hears[], gated: GatedBy): string {
  const actor = who(item.actor);
  if (hears.length === 0) return `No manager hears ${item.place} of ${item.account}, so nothing is done with what ${actor} sent.`;
  if (hears.every((h) => h.paused))
    return `Every manager that hears ${item.place} is paused, so what ${actor} sent is left until one goes on.`;
  const live = gated.filter((g) => !hears.find((h) => h.manager === g.manager)?.paused);
  return `No manager that is on lets ${actor} in (${live.map((g) => `${g.manager}: ${g.gated.why}`).join(" ")}), so it is left.`;
}

/** Follows open work, says stop, or nobody lets it in: decided without a model. */
export function settled(input: Settle): Decision | undefined {
  const { item, hears, open } = input;
  const gated = gatedBy(item, hears);
  const follows: OpenWork | undefined = open.find((w) => w.follows.includes(item.thread));
  if (follows !== undefined) {
    const owner = hears.find((h) => h.manager === follows.manager);
    if (saysStop(item.text) && mayStop(item, owner))
      return {
        _tag: "Stopped",
        item: item.id,
        gated,
        verdicts: [],
        work: follows.id,
        why: `${who(item.actor)} may ask and said stop, so work ${follows.id} (${follows.title}) is stopped.`,
      };
    return {
      _tag: "Joined",
      item: item.id,
      gated,
      verdicts: [],
      work: follows.id,
      why: `It is in the conversation that work ${follows.id} follows, so it joins that work and starts none.`,
    };
  }
  const anyone = hears.some((h) => !h.paused && gated.find((g) => g.manager === h.manager)?.gated.let !== "no");
  if (anyone) return undefined;
  return { _tag: "Left", item: item.id, gated, verdicts: [], why: nobodyLetsIn(item, hears, gated) };
}
