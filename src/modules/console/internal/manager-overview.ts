import { measures } from "~/modules/measures/service.ts";
import type { Measure, Objective } from "~/modules/playbook/types.ts";
import type { Comment, ManagerOverview } from "~/modules/views-manager/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { ok, problem } from "./around.ts";
import { headOf, openManager } from "./managers.ts";
import type { Proposal } from "./proposals.ts";

/* A manager's first page: whether it is working, read where it cannot write; and what waits for someone to say yes. Nothing stands in for a number that cannot be read yet. */

const DAYS = 86_400_000;
const WEEK = 7 * DAYS;

const readOf = (measure: Measure): string =>
  measure.read.from === "connector"
    ? `${measure.read.account}: ${measure.read.query}`
    : `${measure.read.person} says: ${measure.read.asks}`;

function aimOf(objective: Objective): ManagerOverview["measures"][number]["aim"] {
  const by = Date.parse(objective.aim.by);
  return {
    value: objective.aim.value,
    by: Number.isFinite(by) ? by : null,
    limit: objective.measure.better === "more" ? "at least" : "under",
    note: null,
  };
}

function measureOf(
  measure: Measure,
  role: "result" | "guard",
  aim: ManagerOverview["measures"][number]["aim"],
  from: number,
  why: string,
): ManagerOverview["measures"][number] {
  const known = "value" in measure.before ? measure.before.value : null;
  return {
    counts: measure.counts,
    read: readOf(measure),
    tile: { id: measure.counts, label: measure.counts, value: null, unit: "count", change: null, better: measure.better, points: [] },
    is: "not yet",
    role,
    before: { value: known, note: "unknown" in measure.before ? measure.before.unknown : null },
    aim,
    per: measure.unit.endsWith("week") ? "week" : measure.unit.endsWith("month") ? "month" : null,
    notYet: { from, why },
  };
}

function railOf(c: ConsoleDeps, comments: readonly Comment[], proposals: readonly Proposal[], manager: string): ManagerOverview["rail"] {
  const proposed = proposals
    .filter(({ state }) => state === "open")
    .map((one) => ({
      tone: "proposes" as const,
      title: one.title,
      text: one.says,
      link: `/m/${manager}/compare/${one.id}`,
      for: c.people.find(({ id }) => id === one.to)?.name ?? one.to,
      since: one.at,
    }));
  const offered = comments
    .filter((one) => one.became._tag === "Change" && one.became.is === "offered")
    .map((one) => ({
      tone: "proposes" as const,
      title: `A line to accept on ${one.on}`,
      text: one.text,
      link: `/m/${manager}/playbook`,
      for: null,
      since: one.at,
    }));
  return [...proposed, ...offered].toSorted((a, b) => b.since - a.since);
}

export async function managerOverview(c: ConsoleDeps, id: string) {
  const open = await openManager(c, id);
  if (open === undefined) return problem(404, `There is no manager "${id}" here.`);
  const { playbook } = open;
  if (playbook === null) return problem(422, `The playbook does not read: ${open.problems[0]?.says ?? "it has a problem"}`);
  const now = c.clock.now();
  const { objective } = playbook;
  const standing = measures.standing(objective, open.row.at, [], now);
  const from = standing._tag === "NotYet" ? standing.until : now;
  const why = standing._tag === "NotYet" ? standing.why : "Nothing has been read yet.";
  const [comments, proposals] = await Promise.all([
    open.store.kept("comment") as Promise<readonly Comment[]>,
    open.store.kept("proposal") as Promise<readonly Proposal[]>,
  ]);
  const view: ManagerOverview = {
    head: await headOf(c, open),
    said: objective.said,
    says: `${objective.measure.counts}, ${objective.measure.unit}, ${objective.measure.better === "more" ? "at least" : "under"} ${objective.aim.value} by ${objective.aim.by}`,
    by: { person: c.people.find((one) => one.id === objective.owner)?.name ?? objective.owner, at: open.version.at },
    standing,
    unit: objective.measure.unit,
    brought: [],
    measures: [
      measureOf(objective.measure, "result", aimOf(objective), from, why),
      ...objective.notWorse.map((one) =>
        measureOf(
          one.measure,
          "guard",
          { value: one.limit, by: null, limit: one.measure.better === "less" ? "under" : "at least", note: null },
          from,
          why,
        ),
      ),
    ],
    worse: measures.worse(objective, {}, now),
    lost: measures.lost([]),
    lostWhy: [],
    readAt: now,
    tiles: [],
    tilesNotYet: [],
    connectors: [],
    rail: railOf(c, comments, proposals, id),
  };
  return ok(view);
}

export { WEEK };
