import { MANAGERS } from "../../../world";
import { TRENDS } from "../../system/totals";
import { MODELS } from "./models";

/* The money. A day is the system overview's cost day, so the week is the same 369 everywhere (the days of DAILY.cost, scaled to the managers' week). */
export const LIMIT = 100;
export const TELL_AT = 80;
export const DAY_COST: readonly { readonly day: string; readonly cost: number }[] = (TRENDS.find((t) => t.key === "cost")?.data ?? []).map((p) => ({ day: p.label, cost: p.current }));
export const WEEK = DAY_COST.reduce((a, d) => a + d.cost, 0);
export const MOST = DAY_COST.reduce((a, d) => (d.cost > a.cost ? d : a), DAY_COST[0] ?? { day: "", cost: 0 });
/** Over the managers: each is counted once, the same way the overview does. */
export const BY_MANAGER = MANAGERS.map((m) => ({ id: m.id, name: m.name, cost: m.last7.cost }));
export const BY_MODEL = MODELS.map((m) => ({ id: m.id, name: m.name, cost: m.week }));
export const sum = (rows: readonly { readonly cost: number }[]) => rows.reduce((a, r) => a + r.cost, 0);

/** How the limit is handed out. `part`: dollars a day. `piece`: most for one piece of work. */
export const PARTS: readonly { readonly id: string; readonly part: number; readonly piece: number }[] = [
  { id: "root", part: 5, piece: 15 }, { id: "coding", part: 30, piece: 20 }, { id: "docs", part: 5, piece: 5 }, { id: "releases", part: 5, piece: 10 },
  { id: "support", part: 20, piece: 5 }, { id: "whatsapp", part: 10, piece: 2 }, { id: "sales", part: 25, piece: 10 },
];

/** Billing. People are the three in Members who have signed in. */
export const PLAN = { name: "Team", perPerson: 20, people: 3, hoursIncluded: 500, hoursUsed: 318, over: "$0.08 an hour past that", next: "1 Dec" } as const;
export const INVOICES = [
  { id: "i3", date: "1 Nov", what: "October, 3 people", total: 60, state: "Paid" },
  { id: "i2", date: "1 Oct", what: "September, 3 people", total: 60, state: "Paid" },
  { id: "i1", date: "14 Sep", what: "From 14 Sep, 2 people", total: 40, state: "Paid" },
] as const;
