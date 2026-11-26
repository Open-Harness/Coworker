import { works } from "~/modules/work/service.ts";
import type { BoardRow } from "~/modules/manager-store/types.ts";
import type { ThreadRow } from "~/modules/working/types.ts";
import type { WorkView } from "~/modules/views-manager/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { ok, problem } from "./around.ts";
import { headOf, openManager } from "./managers.ts";

/* One piece of work, as its page is given it: what it is, who answers for it, what each thread did, and what shows it. */

const GITHUB = "https://github.com";

export const stateOf = (row: ThreadRow, waiting: boolean): "working" | "waits" | "ended" =>
  row.state === "ended" ? "ended" : waiting ? "waits" : "working";

function threadsOf(row: BoardRow, now: number): WorkView["threads"] {
  const waiting = row.work.waits !== null;
  return row.threads.map((one, at) => {
    const next = row.threads[at + 1]?.started;
    return {
      id: one.id,
      agent: one.agent,
      role: one.role,
      state: stateOf(one, waiting),
      started: one.started,
      took: Math.max((one.state === "ended" ? (next ?? now) : now) - one.started, 0),
      cost: 0,
      brief: one.brief,
      title: one.brief.split("\n")[0] ?? "",
      said: one.said,
    };
  });
}

export async function workView(c: ConsoleDeps, managerId: string, workId: string) {
  const open = await openManager(c, managerId);
  if (open === undefined) return problem(404, `There is no manager "${managerId}" here.`);
  const row = (await open.store.board()).find(({ work }) => work.id === workId);
  if (row === undefined) return problem(404, `There is no work "${workId}" of this manager.`);
  const { work } = row;
  const kinds = open.playbook?.kinds ?? [];
  const names = new Map(c.people.map((one) => [one.id, one.name]));
  const columns = works.columns(kinds);
  const now = c.clock.now();
  const view: WorkView = {
    head: await headOf(c, open),
    work,
    kindName: kinds.find((one) => one.id === work.kind)?.name ?? work.kind,
    stepName: columns.find((one) => one.id === work.step)?.name ?? work.step,
    answers: { id: work.answers, name: names.get(work.answers) ?? work.answers, is: "person" },
    labels: [],
    told: [],
    options: {
      steps: columns.map(({ id, name }) => ({ id, name })),
      kinds: kinds.map(({ id, name }) => ({ id, name })),
      answerers: c.people.map(({ id, name }) => ({ id, name, is: "person" as const })),
    },
    asked: names.get(work.asked) ?? work.asked,
    from: `${work.from.place} #${work.from.id}`,
    started: row.threads[0]?.started ?? now,
    limit: work.mandate.limits.perWork ?? null,
    attention: work.waits === null ? 0 : 1,
    approach: "",
    threads: threadsOf(row, now),
    links: work.follows
      .filter((one) => one.connector === "github")
      .map((one) => ({
        is: one.id === work.from.id ? "Issue" : "Pull request",
        id: `${one.place} #${one.id}`,
        title: work.title,
        says: work.ended === null ? "Open" : work.ended.as,
        link: `${GITHUB}/${one.place}/${one.id === work.from.id ? "issues" : "pull"}/${one.id}`,
      })),
    evidence: work.evidence.map((one) => ({
      name: one.check,
      says: one.says,
      size: "",
      by: "agent" in one.by ? one.by.agent : "person" in one.by ? (names.get(one.by.person) ?? one.by.person) : "code",
      link: one.link ?? "",
    })),
    activity: [],
  };
  return ok(view);
}
