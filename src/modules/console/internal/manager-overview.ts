import type { ManagerOverview } from "~/modules/views-manager/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { ok, problem } from "./around.ts";
import { headOf, openManager } from "./managers.ts";

/* A manager's first page: who it is, what it was asked to be good at, and who it needs. What no one has measured yet is said so, and is not shown as a number. */

const WEEK = 7 * 86_400_000;

export async function managerOverview(c: ConsoleDeps, id: string) {
  const open = await openManager(c, id);
  if (open === undefined) return problem(404, `There is no manager "${id}" here.`);
  const now = c.clock.now();
  const objective = open.playbook?.objective;
  const view: ManagerOverview = {
    head: await headOf(c, open),
    said: objective?.said ?? "",
    says: objective?.said ?? "",
    by: { person: open.version.by, at: open.version.at },
    standing: { _tag: "NotYet", until: now + WEEK, why: "Nothing has been measured yet." },
    unit: "",
    brought: [],
    measures: [],
    worse: [],
    lost: { steps: [], most: null },
    lostWhy: [],
    readAt: now,
    tiles: [],
    tilesNotYet: [],
    connectors: [],
    rail: [],
  };
  return ok(view);
}
