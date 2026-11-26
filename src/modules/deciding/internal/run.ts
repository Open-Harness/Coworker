import { intake } from "~/modules/intake/service.ts";
import type { Decision, Hears, Item } from "~/modules/intake/types.ts";
import type { DecidingDeps, Pending } from "../types.ts";
import { hearsOf, type Listener, listenerOf, openOf } from "./hears.ts";
import { judge } from "./judge.ts";

/** When a judge that did not answer is asked again. */
const AGAIN = 15 * 60_000;

async function listeners(c: DecidingDeps, hears: readonly string[]): Promise<readonly Listener[]> {
  const rows = c.store.managers().filter(({ node }) => hears.includes(node.id));
  const found = await Promise.all(rows.map(async (row) => listenerOf(row, await c.manager(row).hearing())));
  return found.flatMap((one) => (one === undefined ? [] : [one]));
}

/** A decision, from what settles it without a judge, else from a judge's reading. */
async function decide(c: DecidingDeps, item: Item, heard: readonly Listener[], now: number): Promise<Decision> {
  const hears: readonly Hears[] = heard.map(hearsOf);
  const open = openOf(heard);
  const settled = intake.settled({ item, hears, open, now });
  if (settled !== undefined) return settled;
  const first = heard.find(({ row }) => row.node.state === "runs") ?? heard[0];
  const agent = first?.playbook.agents.find(({ id }) => id === "judge");
  const judgement = await judge(c.models, c.call, item, hears, open, agent);
  return intake.decide({ item, hears, open, judgement, now });
}

/** What follows from a decision: a manager takes it on, or the work that follows it hears it. `NotTaken`: the manager is not there to take it. */
async function act(c: DecidingDeps, item: Item, decision: Decision, heard: readonly Listener[]): Promise<"Acted" | "NotTaken"> {
  if (decision._tag === "Took") {
    const taker = heard.find(({ row }) => row.node.id === decision.manager);
    if (taker === undefined) return "Acted";
    const taken = await c.manager(taker.row).take({ item, took: decision, answers: taker.playbook.objective.owner });
    if ("_tag" in taken) return "NotTaken";
  }
  if (decision._tag === "Joined") {
    const owner = heard.find(({ hearing }) => hearing.open.some(({ id }) => id === decision.work));
    if (owner !== undefined) await c.manager(owner.row).heard({ work: decision.work, item });
  }
  if (decision._tag === "Stopped") {
    const owner = heard.find(({ hearing }) => hearing.open.some(({ id }) => id === decision.work));
    const person = item.actor.person ?? item.actor.name;
    const event = {
      key: `stopped:${decision.work}:${item.id}`,
      at: c.clock.now(),
      is: "stopped",
      person,
      why: `${person} said to stop.`,
    } as const;
    if (owner !== undefined) await c.manager(owner.row).news({ work: decision.work, event });
  }
  return "Acted";
}

/** `retry`: when this item is asked again. `held`: nothing was decided, and nothing after it is decided before it. */
async function one(c: DecidingDeps, { item, hears }: Pending): Promise<{ readonly retry: number | null; readonly held: boolean }> {
  const now = c.clock.now();
  const standing = await c.standing(item).catch(() => undefined);
  const known: Item = standing === undefined ? item : { ...item, actor: { ...item.actor, standing } };
  const heard = await listeners(c, hears);
  const decision = await decide(c, known, heard, now);
  if ((await act(c, known, decision, heard)) === "NotTaken") return { retry: now + 5_000, held: true };
  const retry = decision._tag === "CouldNot" ? now + AGAIN : null;
  c.store.decided(item.id, decision, retry);
  return { retry, held: false };
}

/** Everything that came in and is not decided, in the order it came: one at a time, so that the second finds the work the first made. */
export async function run(c: DecidingDeps): Promise<{ readonly again: number | null }> {
  let again: number | null = null;
  for (const pending of c.store.pending(c.clock.now())) {
    try {
      const { retry, held } = await one(c, pending);
      if (held && retry !== null) return { again: retry };
      if (retry !== null) again = Math.min(again ?? retry, retry);
    } catch {
      // Nothing was decided: it is tried again soon, and nothing after it is decided before it.
      return { again: c.clock.now() + 5_000 };
    }
  }
  return { again };
}
