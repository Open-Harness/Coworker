import type { ThreadsView } from "~/modules/views-manager/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { ok, problem } from "./around.ts";
import { headOf, openManager } from "./managers.ts";
import { stateOf } from "./work-view.ts";

/* A manager's threads: one for each conversation of an agent on a piece of work. What they cost is what they were charged. */

const WEEK = 7 * 86_400_000;

export async function threadsView(c: ConsoleDeps, managerId: string) {
  const open = await openManager(c, managerId);
  if (open === undefined) return problem(404, `There is no manager "${managerId}" here.`);
  const [rows, usage] = [await open.store.board(), await open.store.usage()];
  const now = c.clock.now();
  const all = rows.flatMap((row) => row.threads.map((one) => ({ one, work: row.work })));
  const view: ThreadsView = {
    head: await headOf(c, open),
    rows: all.map(({ one, work }) => ({
      id: one.id,
      manager: managerId,
      work: work.id,
      under: work.id,
      agent: one.agent,
      role: one.role,
      version: work.version,
      model: one.model ?? "",
      on: work.from,
      state: stateOf(one, work.waits !== null),
      started: one.started,
      took: Math.max(now - one.started, 0),
      cost: 0,
      title: one.brief.split("\n")[0] ?? "",
      said: one.said,
      knew: 0,
    })),
    conversations: rows.map(({ work }) => ({ id: work.id, name: work.title, work: work.id })),
    ended7: all.filter(({ one }) => one.state === "ended" && now - one.started < WEEK).length,
    cost7: usage.filter(({ day }) => now - day < WEEK).reduce((sum, { dollars }) => sum + dollars, 0),
    limits: [],
  };
  return ok(view);
}
