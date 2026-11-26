import { expect } from "vitest";
import type { Grown, ManagerNode } from "~/modules/tree/types.ts";
import type { Grant, Limits, Permission, Reach } from "~/modules/reach/types.ts";

export const grant = (account: string, place: string, may: Record<string, Permission>): Grant => ({ account, place, may });
export const reach = (grants: readonly Grant[], limits: Limits = {}): Reach => ({ grants, limits });
export const whole = reach(
  [
    grant("github", "*", { "github.read": "on", "github.comment": "on", "github.push": "on", "github.merge": "ask" }),
    grant("email", "*", { "email.reply": "on" }),
  ],
  { perWork: 10, perDay: 40 },
);
export const node = (id: string, above: string | null, own: Reach, more: Partial<ManagerNode> = {}): ManagerNode => ({
  id,
  name: id.toUpperCase(),
  above,
  answers: "bo",
  template: null,
  version: 1,
  state: "runs",
  reach: own,
  ...more,
});
export const coding = node(
  "coding",
  null,
  reach([grant("github", "*", { "github.read": "on", "github.comment": "on", "github.push": "on", "github.merge": "ask" })], {
    perWork: 10,
    perDay: 40,
  }),
);
export const docs = node(
  "docs",
  "coding",
  reach([grant("github", "*", { "github.read": "on", "github.comment": "on", "github.push": "ask" })], { perWork: 5 }),
);
export const releases = node("releases", "docs", reach([grant("github", "*", { "github.read": "on" })], { perWork: 3 }));
export const support = node("support", null, reach([grant("email", "*", { "email.reply": "on" })], { perWork: 4 }));
export const nodes = [coding, docs, releases, support];

export const ids = (list: readonly ManagerNode[]) => list.map((n) => n.id).sort();
export const grown = (said: Grown) => {
  expect(said._tag).toBe("Grown");
  if (said._tag !== "Grown") throw new Error(`refused: ${said.why}`);
  return said;
};
export const refused = (said: Grown, names?: RegExp) => {
  expect(said._tag).toBe("Refused");
  if (said._tag !== "Refused") throw new Error("not refused");
  expect(said.why.trim().length).toBeGreaterThan(3);
  expect(said.why).not.toMatch(/\b(blocked|pending)\b/iu);
  expect(said.problems.length).toBeGreaterThan(0);
  for (const p of said.problems) expect(p.says.trim().length).toBeGreaterThan(3);
  if (names) expect(`${said.why} ${said.problems.map((p) => p.says).join(" ")}`).toMatch(names);
};
export const by = (list: readonly ManagerNode[], id: string): ManagerNode => {
  const found = list.find((n) => n.id === id);
  if (!found) throw new Error(`no node ${id}`);
  return found;
};
export const rank = { off: 0, ask: 1, on: 2 } as const;
/** What a reach allows, as plain data: an action that is off is the same as one that is not listed. */
export const flat = (r: Reach) => {
  const out: Record<string, Permission> = {};
  for (const g of r.grants) for (const [action, p] of Object.entries(g.may)) if (p !== "off") out[`${g.account}|${g.place}|${action}`] = p;
  return out;
};
export const allows = (r: Reach, account: string, place: string, action: string): Permission => {
  let best: Permission = "off";
  for (const g of r.grants) {
    if (g.account !== account || (g.place !== place && g.place !== "*")) continue;
    const p = g.may[action] ?? "off";
    if (rank[p] > rank[best]) best = p;
  }
  return best;
};
/** Every power of `part` is also in `whole`, at most as strong, and every limit is no higher. */
export const within = (part: Reach, whole: Reach) => {
  for (const g of part.grants)
    for (const [action, p] of Object.entries(g.may)) if (rank[p] > rank[allows(whole, g.account, g.place, action)]) return false;
  for (const key of ["perWork", "perDay", "perMonth", "hours", "atOnce"] as const) {
    const a = part.limits[key];
    const b = whole.limits[key];
    if (a !== undefined && b !== undefined && a > b) return false;
  }
  return true;
};
/** After any event, no manager is wider than the one above it or than the whole. */
export const sound = (list: readonly ManagerNode[]) => {
  for (const n of list) {
    const above = n.above === null ? whole : by(list, n.above).reach;
    expect(within(n.reach, above), `${n.id} within ${n.above ?? "the whole"}`).toBe(true);
  }
};
