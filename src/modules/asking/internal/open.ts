import { asks } from "~/modules/asks/service.ts";
import type { AskAnswer, AskingDeps, OpenAsk } from "../types.ts";

/** An ask is made once by its id: asking again with it finds the one that is there, whatever else it says. */
export function open(c: AskingDeps, input: OpenAsk): Extract<AskAnswer, { op: "open" }> {
  const known = c.store.get(input.ask.id);
  if (known !== undefined) return { op: "open", asked: { _tag: "Asked", ask: known.ask }, isNew: false };
  const asked = asks.ask(input.ask, c.clock.now());
  if (asked._tag === "Refused") return { op: "open", asked, isNew: false };
  c.store.put({
    ask: asked.ask,
    from: input.from,
    kind: input.kind,
    person: input.person,
    looked: input.looked,
    otherwise: input.otherwise,
    links: input.links,
    told: false,
  });
  return { op: "open", asked, isNew: true };
}

/** Everything of this work that is asked is not asked any more: it ended. */
export function gone(c: AskingDeps, work: string, why: string, only?: string): void {
  for (const kept of c.store.open()) {
    if (kept.ask.about.work === work && (only === undefined || kept.ask.id === only))
      c.store.put({ ...kept, ask: { ...kept.ask, state: { _tag: "Gone", why } }, told: true });
  }
}
