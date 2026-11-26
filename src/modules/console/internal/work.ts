import { works } from "~/modules/work/service.ts";
import type { WorkView } from "~/modules/views-manager/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { headOf, openManager } from "./managers.ts";
import { ok, problem } from "./around.ts";

/* One piece of work, as its page shows it. */

const GITHUB = "https://github.com";

export async function workView(c: ConsoleDeps, manager: string, id: string) {
  const open = await openManager(c, manager);
  if (open === undefined) return problem(404, `There is no manager "${manager}" here.`);
  const row = await open.store.work(id);
  if (row === undefined) return problem(404, `There is no work "${id}" here.`);
  const { work } = row;
  const kinds = open.playbook?.kinds ?? [];
  const kind = kinds.find((one) => one.id === work.kind);
  const names = Object.fromEntries(c.people.map((one) => [one.id, one.name]));
  const answers = {
    id: work.answers,
    name: names[work.answers] ?? work.answers,
    is: work.answers === manager ? "manager" : "person",
  } as const;
  const view: WorkView = {
    head: await headOf(c, open),
    work,
    kindName: kind?.name ?? work.kind,
    stepName: work.ended === null ? (kind?.steps.find((step) => step.id === work.step)?.name ?? work.step) : "Done",
    answers,
    labels: [],
    told: [],
    options: {
      steps: works.columns(kinds).map(({ id: step, name }) => ({ id: step, name })),
      kinds: kinds.map(({ id: one, name }) => ({ id: one, name })),
      answerers: c.people.map((one) => ({ id: one.id, name: one.name, is: "person" as const })),
    },
    asked: names[work.asked] ?? work.asked,
    from: `${work.from.place} #${work.from.id}`,
    started: row.activity[0]?.at ?? row.threads[0]?.started ?? 0,
    limit: work.mandate.limits.perWork ?? null,
    attention: 0,
    approach: "",
    threads: row.threads.map((thread) => ({
      id: thread.id,
      agent: thread.agent,
      role: thread.role,
      state: thread.state,
      started: thread.started,
      took: 0,
      cost: 0,
      brief: thread.brief,
      title: thread.brief.split("\n")[0] ?? "",
      said: thread.said,
    })),
    links: work.follows
      .filter((one) => one.connector === "github")
      .map((one) => ({
        is: one.id === work.from.id ? "Issue" : "Pull request",
        id: `#${one.id}`,
        title: work.title,
        says: "",
        link: `${GITHUB}/${one.place}/${one.id === work.from.id ? "issues" : "pull"}/${one.id}`,
      })),
    evidence: [],
    activity: row.activity,
  };
  return ok(view);
}
