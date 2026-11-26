import { playbooks } from "~/modules/playbook/service.ts";
import type { Playbook } from "~/modules/playbook/types.ts";
import type { Day, OverviewView, Tile, TreeRow, TreeView } from "~/modules/views-workspace/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { idle, personOf, rolled } from "./around.ts";
import { settingOr } from "./settings-kept.ts";

/* The workspace seen from the top: the tree of managers, and the numbers over a period. Nothing has been counted before something came in. */

const DAY = 86_400_000;

async function playbookOf(
  c: ConsoleDeps,
  objectId: string,
  region: ConsoleDeps["workspace"]["region"],
): Promise<{ playbook: Playbook | null; version: number; changed: number }> {
  const version = await c.managers.get(objectId, region).version();
  if (version === undefined) return { playbook: null, version: 0, changed: 0 };
  const read = playbooks.read(version.files);
  return { playbook: read._tag === "Playbook" ? read.playbook : null, version: version.number, changed: version.at };
}

export async function treeView(c: ConsoleDeps): Promise<TreeView> {
  const rows = await c.store.managers();
  const rolls = new Map(rolled(rows.map(({ node }) => node)).map((one) => [one.id, one]));
  const tree: TreeRow[] = [];
  for (const row of rows) {
    const { playbook, version, changed } = await playbookOf(c, row.objectId, row.region);
    const own = rolls.get(row.node.id) ?? idle(row.node);
    tree.push({
      ...own,
      name: row.node.name,
      above: row.node.above,
      job:
        playbook?.page
          .split("\n")
          .find((line) => line.trim() !== "" && !line.startsWith("#"))
          ?.trim() ?? "",
      version,
      connectors: [...new Set((playbook?.reach.grants ?? []).map(({ account }) => account))],
      mcp: [],
      limit: row.node.reach.limits.perDay ?? 0,
      objective: playbook?.objective.said ?? "",
      standing: "on its line",
      threads: 0,
      now: row.node.state === "paused" ? "Paused" : "Waiting for something to come in",
      changed,
      sentBack: 0,
    });
  }
  const owners = c.people.filter(({ role }) => role === "Owner").map(personOf);
  return {
    rows: tree,
    answers: owners,
    trying: [],
    pages: [
      { id: "Playbook", text: "Each manager has its own playbook, made from a template." },
      { id: "Notes", text: "What the co-worker has learned is kept as notes." },
      { id: "Trying now", text: "Nothing is being tried." },
      { id: "Reach", text: "A manager may do no more than the one above it." },
    ],
  };
}

const PERIODS = ["7", "30", "90"] as const;

function days(from: number, now: number): readonly Day[] {
  const today = Math.floor(now / DAY) * DAY;
  return Array.from({ length: 7 }, (_, n) => ({
    day: today - (6 - n) * DAY - from,
    came: 0,
    out: 0,
    sentBack: 0,
    cost: 0,
    people: 0,
    wait: 0,
  }));
}

const tile = (id: string, label: string, unit: Tile["unit"], better: Tile["better"]): Tile => ({
  id,
  label,
  value: 0,
  unit,
  change: null,
  better,
  points: [0, 0, 0, 0, 0, 0, 0],
});

export async function overviewView(c: ConsoleDeps, query: URLSearchParams): Promise<OverviewView> {
  const asked = query.get("period");
  const period = PERIODS.find((one) => one === asked) ?? "7";
  const [rows, perDay] = await Promise.all([c.store.managers(), settingOr(c.store, "perDay", 100)]);
  const now = c.clock.now();
  const objectives: OverviewView["objectives"][number][] = [];
  for (const row of rows) {
    const { playbook } = await playbookOf(c, row.objectId, row.region);
    if (playbook === null) continue;
    objectives.push({
      manager: row.node.id,
      name: row.node.name,
      says: playbook.objective.said,
      standing: { _tag: "NotYet", until: now + 14 * DAY, why: "Nothing has settled yet" },
      is: "idle",
      progress: 0,
      shouldBe: 0,
      unit: "count",
    });
  }
  void perDay;
  return {
    period,
    updated: now,
    tiles: [
      tile("came", "Came in", "count", "more"),
      tile("done", "Done", "count", "more"),
      tile("sent-back", "Sent back", "share", "less"),
      tile("cost", "Cost", "dollars", "less"),
    ],
    daily: days(0, now),
    dailyBefore: days(7 * DAY, now),
    objectives,
    changed: [],
  };
}
