import { intake } from "~/modules/intake/service.ts";
import type { Decision, Hears, Item } from "~/modules/intake/types.ts";
import type { DecidingDeps, Pending } from "../types.ts";
import { hearsOf, type Listener, listenerOf, openOf } from "./hears.ts";
import { decideChosen } from "./chosen.ts";
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
  const chosen = c.chosen?.(item);
  if (chosen !== undefined) return decideChosen(item, hears, open, chosen, now);
  const settled = intake.settled({ item, hears, open, now });
  if (settled !== undefined) return settled;
  const first = heard.find(({ row }) => row.node.state === "runs") ?? heard[0];
  const agent = first?.playbook.agents.find(({ id }) => id === "judge");
  const judgement = await judge(c.models, c.call, item, hears, open, agent);
  return intake.decide({ item, hears, open, judgement, now });
}

/** Two that fit equally: the one who answers for the first is asked which, and the item waits for the answer. */
async function askWhich(c: DecidingDeps, item: Item, decision: Extract<Decision, { _tag: "Asked" }>, heard: readonly Listener[]): Promise<void> {
  const between = decision.between.flatMap(({ manager, kind }) => {
    const one = heard.find(({ row }) => row.node.id === manager);
    const name = one?.playbook.kinds.find(({ id }) => id === kind)?.name;
    return one === undefined || name === undefined ? [] : [{ manager, name: one.row.node.name, kind, kindName: name }];
  });
  const first = heard.find(({ row }) => row.node.id === between[0]?.manager);
  if (first === undefined) return;
  await c.askWhich?.({ item, to: first.playbook.objective.owner, between, why: decision.why });
}

/** What follows from a decision: a manager takes it on, or the work that follows it hears it. `NotTaken`: the manager is not there to take it. */
async function act(c: DecidingDeps, item: Item, decision: Decision, heard: readonly Listener[]): Promise<"Acted" | "NotTaken"> {
  if (decision._tag === "Took") {
    const taker = heard.find(({ row }) => row.node.id === decision.manager);
    if (taker === undefined) return "Acted";
    const taken = await c.manager(taker.row).take({ item, took: decision, answers: taker.playbook.objective.owner });
    if ("_tag" in taken) return "NotTaken";
  }
  if (decision._tag === "Asked" && decision.between.length > 0) await askWhich(c, item, decision, heard);
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
  const said = await c.answered?.(known);
  if (said !== undefined) {
    const why = `It answered what was asked (${said.ask}), so it is not a new thing.`;
    const answer: Decision = { item: item.id, gated: [], verdicts: [], why, _tag: "Joined", work: said.work ?? "" };
    c.store.decided(item.id, answer, null);
    return { retry: null, held: false };
  }
  const waiting = c.asked?.(known);
  if (waiting !== undefined) {
    const why = `A person is already asked who takes this conversation (${waiting}), so it waits with that and is not a new thing.`;
    c.store.decided(item.id, { item: item.id, gated: [], verdicts: [], why, _tag: "Left" }, null);
    return { retry: null, held: false };
  }
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
