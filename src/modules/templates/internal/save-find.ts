import type { Playbook } from "~/modules/playbook/types.ts";

/* What a manager has that is its own: where it works, who is in it, and which model each agent has. */

export interface Own {
  readonly places: readonly { readonly account: string; readonly place: string }[];
  /** The owner first, then each other person in the order they are met. */
  readonly people: readonly string[];
  /** The accounts it uses. */
  readonly accounts: readonly string[];
  /** The agents that have a model of their own. */
  readonly modelled: readonly string[];
}

const unique = <T>(items: readonly T[]): readonly T[] => [...new Set(items)];

function peopleOf(p: Playbook): readonly string[] {
  const measures = [p.objective.measure, ...p.objective.notWorse.map((n) => n.measure)];
  const steps = p.kinds.flatMap((k) => k.steps);
  return [
    p.objective.owner,
    ...measures.flatMap((m) => (m.read.from === "person" ? [m.read.person] : [])),
    ...steps.flatMap((s) => ("person" in s.by ? [s.by.person] : [])),
    ...steps.flatMap((s) => ("person" in s.checkedBy ? [s.checkedBy.person] : [])),
    ...steps.flatMap((s) => {
      const o = s.otherwise;
      if ("back" in o) return "ask" in o.then ? [o.then.ask] : [];
      return "ask" in o ? [o.ask] : [];
    }),
    ...p.evals.flatMap((e) => (typeof e.judge === "object" && "person" in e.judge ? [e.judge.person] : [])),
    ...p.reach.mayAsk.flatMap((r) => (Array.isArray(r.listed.who) ? (r.listed.who as readonly string[]) : [])),
  ];
}

export function findOwn(p: Playbook): Own {
  const grants = [...p.reach.grants, ...p.kinds.flatMap((k) => k.may)];
  const asked = p.reach.mayAsk.map((r) => ({ account: r.account, place: r.place }));
  const events = p.triggers.flatMap((t) => (t.by === "event" ? [{ account: t.account, place: t.place }] : []));
  const spots = [...grants.map((g) => ({ account: g.account, place: g.place })), ...asked, ...events];
  const seen = new Set<string>();
  const places = spots.filter((s) => {
    const key = `${s.account}\n${s.place}`;
    if (s.place === "*" || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    places,
    people: unique(peopleOf(p).filter((x) => x !== "")),
    accounts: unique(spots.map((s) => s.account)),
    modelled: p.agents.filter((a) => a.model !== "inherit").map((a) => a.id),
  };
}
