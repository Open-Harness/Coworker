import type { Limit, ModelOn, Price, Room, Usage } from "../types.ts";

export function price(usage: Usage, model: ModelOn | undefined): Price {
  const rate = model?.price;
  if (rate === undefined) return { known: false, tokens: usage.input + usage.cached + usage.output };
  const dollars = (usage.input * rate.input + usage.cached * rate.cached + usage.output * rate.output) / 1_000_000;
  return { known: true, dollars };
}

export function add(prices: readonly Price[]): { readonly dollars: number; readonly notKnown: number } {
  const known = prices.flatMap((p) => (p.known ? [p.dollars] : []));
  return { dollars: known.reduce((a, b) => a + b, 0), notKnown: prices.length - known.length };
}

const rank: Readonly<Record<Limit["is"], number>> = { work: 0, manager: 1, workspace: 2 };
const names: Readonly<Record<Limit["is"], string>> = {
  work: "this piece of work",
  manager: "this manager",
  workspace: "the workspace's day",
};

const reached = (limit: Limit): boolean => limit.spent >= limit.most;
const near = (limit: Limit): boolean => limit.spent >= limit.tellAt * limit.most;

/** The narrowest limit that is reached, else the first that is near. */
export function room(limits: readonly Limit[]): Room {
  const over = limits.filter(reached).sort((a, b) => rank[a.is] - rank[b.is])[0];
  if (over !== undefined) {
    return { _tag: "Over", is: over.is, says: `The limit of ${names[over.is]} is reached: ${over.spent} of ${over.most} is spent.` };
  }
  const close = limits.find(near);
  if (close === undefined) return { _tag: "Room" };
  return { _tag: "Tell", says: `The limit of ${names[close.is]} is near: ${close.spent} of ${close.most} is spent.` };
}

/** Each gets what it asked when the whole is enough; else every ask is cut by the same share. */
export function parts(whole: number, asks: Readonly<Record<string, number>>): Readonly<Record<string, number>> {
  const total = Object.values(asks).reduce((a, b) => a + b, 0);
  const share = total <= whole ? 1 : Math.max(0, whole) / total;
  return Object.fromEntries(Object.entries(asks).map(([id, ask]) => [id, ask * share]));
}
