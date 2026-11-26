import type { Kind } from "~/modules/playbook/types.ts";
import { reaches } from "~/modules/reach/service.ts";
import type { Decision, DecideInput, Gated, Hears, Verdict } from "../types.ts";
import { gatedBy, letIn, settled } from "./settled.ts";
import { who } from "./gate.ts";

interface Candidate {
  readonly verdict: Verdict;
  readonly hears: Hears;
  readonly kind: Kind;
  readonly let: Gated["let"];
}

/** Two within this fit equally. */
const EQUAL = 0.1;

function candidatesOf(input: DecideInput, verdicts: readonly Verdict[], gated: Decision["gated"]): Candidate[] {
  const found: Candidate[] = [];
  for (const verdict of verdicts) {
    const hears = input.hears.find((h) => h.manager === verdict.manager);
    const kind = hears?.kinds.find((k) => k.id === verdict.kind);
    if (!verdict.is || hears === undefined || kind === undefined || hears.paused) continue;
    const gate = gated.find((g) => g.manager === hears.manager)?.gated.let ?? "no";
    if (gate === "no" || (gate === "maybe" && kind.alone === "off")) continue;
    found.push({ verdict, hears, kind, let: gate });
  }
  return found;
}

const pairOf = (c: Candidate) => ({ manager: c.hears.manager, kind: c.kind.id });
const words = (c: Candidate) => `${c.hears.name} as ${c.kind.name} (${c.verdict.why})`;

function waitsFor(c: Candidate, input: DecideInput): boolean {
  const all = c.hears.reach.limits.atOnce;
  const own = c.kind.limits.atOnce;
  const ofKind = input.open.filter((w) => w.manager === c.hears.manager && w.kind === c.kind.id).length;
  return (all !== undefined && c.hears.open >= all) || (own !== undefined && ofKind >= own);
}

function took(c: Candidate, input: DecideInput, base: Pick<Decision, "item" | "gated" | "verdicts">): Decision {
  const { item } = input;
  const asked = c.let === "asked";
  const person = item.actor.person ?? item.actor.address;
  const { mandate } = reaches.mandate(
    c.hears.reach,
    { grants: c.kind.may, limits: c.kind.limits },
    {
      strength: asked ? "asked" : "found",
      because: asked ? { by: "person", id: person } : { by: "kind", kind: c.kind.id },
      version: c.hears.version,
    },
  );
  const why = asked
    ? `${who(item.actor)} may ask, and ${words(c)} says it is that, so it takes it.`
    : `${words(c)} says it is that, and the kind may start on its own, so it takes it.`;
  return {
    ...base,
    _tag: "Took",
    manager: c.hears.manager,
    kind: c.kind.id,
    version: c.hears.version,
    mandate,
    waits: waitsFor(c, input),
    why,
  };
}

function one(c: Candidate, input: DecideInput, base: Pick<Decision, "item" | "gated" | "verdicts">): Decision {
  const ask = (why: string): Decision => ({ ...base, _tag: "Asked", between: [pairOf(c)], why });
  if (c.let === "asked") {
    return c.hears.spent >= 1
      ? ask(`${c.hears.name} has spent what it may today (limit reached), so it asks whether to go on as ${c.kind.name}.`)
      : took(c, input, base);
  }
  if (c.kind.alone === "watch")
    return {
      ...base,
      _tag: "Left",
      would: pairOf(c),
      why: `${words(c)} says it is that, but the kind only watches, so it is left and noted.`,
    };
  if (c.kind.alone === "ask") return ask(`${words(c)} says it is that, and nobody asked, so a person is asked.`);
  return c.hears.spent >= 1
    ? ask(`${c.hears.name} has spent what it may today (limit reached), so it asks whether to take it as ${c.kind.name}.`)
    : took(c, input, base);
}

function best(input: DecideInput, verdicts: readonly Verdict[], base: Pick<Decision, "item" | "gated" | "verdicts">): Decision {
  const found = candidatesOf(input, verdicts, base.gated);
  if (found.length === 0) return { ...base, _tag: "Left", why: "No kind that may take it said it is that, so it is left." };
  const top = Math.max(...found.map((c) => c.verdict.fit));
  const near = found.filter((c) => top - c.verdict.fit <= EQUAL + 1e-9);
  const first = near.find((c) => c.verdict.fit === top) ?? near[0]!;
  if (near.length === 1) return one(first, input, base);
  if (near.every((c) => c.let === "maybe" && c.kind.alone === "watch"))
    return {
      ...base,
      _tag: "Left",
      would: pairOf(first),
      why: `${near.map(words).join(" and ")} fit about equally, and they only watch, so it is left.`,
    };
  return {
    ...base,
    _tag: "Asked",
    between: near.map(pairOf),
    why: `${near.map(words).join(" and ")} fit about equally, so a person says which.`,
  };
}

export function decide(input: DecideInput): Decision {
  const done = settled(input);
  if (done !== undefined) return done;
  const gated = gatedBy(input.item, input.hears);
  const base = { item: input.item.id, gated };
  const judgement = input.judgement;
  if (judgement === undefined) return { ...base, _tag: "CouldNot", verdicts: [], why: "Nothing was judged, so it cannot be decided yet." };
  if (judgement._tag === "CouldNot") return { ...base, _tag: "CouldNot", verdicts: [], why: `It could not be judged: ${judgement.why}` };
  const { verdicts, joins } = judgement.judged;
  const open = joins === undefined ? undefined : input.open.find((w) => w.id === joins);
  if (open !== undefined && (letIn(gated, input.hears, open.manager) ?? "no") !== "no")
    return {
      ...base,
      _tag: "Joined",
      verdicts,
      work: open.id,
      why: `The judge says it is about work ${open.id} (${open.title}), so it joins that work.`,
    };
  return best(input, verdicts, { ...base, verdicts });
}
