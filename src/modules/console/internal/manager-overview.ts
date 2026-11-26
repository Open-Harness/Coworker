import type { Measure } from "~/modules/playbook/types.ts";
import type { ManagerOverview } from "~/modules/views-manager/types.ts";
import type { Tile } from "~/modules/views-workspace/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { headOf, openManager } from "./managers.ts";
import { ok, problem } from "./around.ts";

/* A manager's first page: what it is for, how it stands, and what it needs. Nothing is read before something came in. */

const DAY = 86_400_000;

const tileOf = (id: string, measure: Measure): Tile => ({
  id,
  label: measure.counts,
  value: null,
  unit: "count",
  change: null,
  better: measure.better,
  points: [],
});

const perOf = (unit: string): "week" | "month" | null => (/week/iu.test(unit) ? "week" : /month/iu.test(unit) ? "month" : null);

export async function managerOverview(c: ConsoleDeps, id: string) {
  const open = await openManager(c, id);
  if (open === undefined) return problem(404, `There is no manager "${id}" here.`);
  const { playbook } = open;
  const now = c.clock.now();
  const objective = playbook?.objective;
  const results = objective === undefined ? [] : [{ measure: objective.measure, role: "result" as const, limit: null as number | null }];
  const guards = (objective?.notWorse ?? []).map(({ measure, limit }) => ({ measure, role: "guard" as const, limit }));
  const measures: ManagerOverview["measures"] = [...results, ...guards].map(({ measure, role, limit }, n) => ({
    counts: measure.counts,
    read: measure.read.from === "connector" ? `${measure.read.account}: ${measure.read.query}` : measure.read.asks,
    tile: tileOf(`m${n}`, measure),
    is: "not yet",
    role,
    before: {
      value: "value" in measure.before ? measure.before.value : null,
      note: "unknown" in measure.before ? measure.before.unknown : null,
    },
    aim:
      role === "result"
        ? {
            value: objective?.aim.value ?? null,
            by: objective === undefined ? null : Date.parse(objective.aim.by) || null,
            limit: measure.better === "more" ? "at least" : "under",
            note: null,
          }
        : { value: limit, by: null, limit: measure.better === "more" ? "at least" : "under", note: null },
    per: perOf(measure.unit),
    notYet: { from: now + DAY * 14, why: "Nothing has settled yet" },
  }));
  const view: ManagerOverview = {
    head: await headOf(c, open),
    said: objective?.said ?? "",
    says: objective?.said ?? "",
    by: { person: open.version.by, at: open.row.at },
    standing: { _tag: "NotYet", until: now + DAY * 14, why: "Nothing has settled yet" },
    unit: objective?.measure.counts ?? "",
    brought: (playbook?.kinds ?? []).map(({ id: kind }) => ({ kind, points: [] })),
    measures,
    worse: [],
    lost: { steps: [], most: null },
    lostWhy: [],
    readAt: now,
    tiles: [],
    tilesNotYet: [],
    connectors: (playbook?.reach.grants ?? []).map(({ account }) => ({
      id: account,
      name: account,
      as: account,
      works: true,
      says: "Works",
      in: 0,
      out: 0,
    })),
    rail: [],
  };
  return ok(view);
}
