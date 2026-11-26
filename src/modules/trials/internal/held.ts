import type { Case } from "../types.ts";

function byId(a: Case, b: Case): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Half of each part's cases, the lower half of an odd number, chosen by the cases alone. Their flags and order are ignored. */
export function held(cases: readonly Case[]): readonly Case[] {
  const parts = new Map<string, Case[]>();
  for (const one of cases) parts.set(one.of, [...(parts.get(one.of) ?? []), one]);
  const out = new Set<string>();
  for (const group of parts.values()) {
    for (const one of group.toSorted(byId).slice(0, Math.floor(group.length / 2))) out.add(one.id);
  }
  return cases.filter((one) => out.has(one.id));
}
