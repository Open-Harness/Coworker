import { works } from "~/modules/work/service.ts";
import type { ThreadRow } from "~/modules/working/types.ts";
import type { Work } from "~/modules/work/types.ts";
import type { WorkView } from "~/modules/views-manager/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { headOf, openManager } from "./managers.ts";
import { ok, problem } from "./around.ts";

/* One piece of work, as its page shows it: where it is, who answers, what its agents did, what shows that it is done, and what people did to it. */

const GITHUB = "https://github.com";

export const stateOf = (row: ThreadRow, waiting: boolean): "working" | "waits" | "ended" =>
  row.state === "ended" ? "ended" : waiting ? "waits" : "working";

const linksOf = (work: Work): WorkView["links"] =>
  work.follows
    .filter((one) => one.connector === "github")
    .map((one) => ({
      is: one.id === work.from.id ? "issue" : "pull request",
      id: one.id,
      title: `${one.place} #${one.id}`,
      says: one.id === work.from.id ? "Where it was asked" : "Where it is answered",
      link: `${GITHUB}/${one.place}/${one.id === work.from.id ? "issues" : "pull"}/${one.id}`,
    }));

export async function workView(c: ConsoleDeps, manager: string, id: string) {
  const open = await openManager(c, manager);
  if (open === undefined) return problem(404, `There is no manager "${manager}" here.`);
  const row = (await open.store.board()).find(({ work: one }) => one.id === id);
  if (row === undefined) return problem(404, `There is no work "${id}" on ${open.row.node.name}.`);
  const { work } = row;
  const kinds = open.playbook?.kinds ?? [];
  const kind = kinds.find((one) => one.id === work.kind);
  const names = Object.fromEntries(c.people.map((one) => [one.id, one.name]));
  const step = kind?.steps.find((one) => one.id === work.step);
  const now = c.clock.now();
  const activity = await c.store.activity(work.id);
  const view: WorkView = {
    head: await headOf(c, open),
    work,
    kindName: kind?.name ?? work.kind,
    stepName: step?.name ?? (work.step === "done" ? "Done" : "Triage"),
    answers: {
      id: work.answers,
      name: names[work.answers] ?? open.row.node.name,
      is: names[work.answers] === undefined ? "manager" : "person",
    },
    labels: [],
    told: [],
    options: {
      steps: [{ id: "triage", name: "Triage" }, ...(kind?.steps.map(({ id: one, name }) => ({ id: one, name })) ?? [])],
      kinds: kinds.map(({ id: one, name }) => ({ id: one, name })),
      answerers: [
        { id: open.row.node.id, name: open.row.node.name, is: "manager" },
        ...c.people.map((one) => ({ id: one.id, name: one.name, is: "person" as const })),
      ],
    },
    asked: work.asked,
    from: `${work.from.place} #${work.from.id}`,
    started: row.threads[0]?.started ?? activity[0]?.at ?? now,
    limit: work.mandate.limits.perWork ?? null,
    attention: work.waits === null ? 0 : 1,
    approach: step?.does ?? "",
    threads: row.threads.map((thread) => ({
      id: thread.id,
      agent: thread.agent,
      role: thread.role,
      state: thread.state,
      started: thread.started,
      took: 0,
      cost: 0,
      brief: thread.brief,
      title: thread.brief.split("\n")[0] ?? thread.brief,
      said: thread.said,
    })),
    links: linksOf(work),
    evidence: work.evidence.map((one) => ({
      name: one.check,
      says: one.says,
      size: one.met ? "met" : "not met",
      by: "agent" in one.by ? one.by.agent : "person" in one.by ? (names[one.by.person] ?? one.by.person) : "code",
      link: one.link ?? "",
    })),
    activity: [
      ...activity.map(({ who, at, text }) => ({ who, at, text })),
      ...(row.hold === null ? [] : [{ who: open.row.node.name, at: now, text: row.hold.why }]),
      ...(work.ended === null
        ? []
        : [{ who: open.row.node.name, at: work.ended.at, text: `${works.says(work, names)}: ${work.ended.why}` }]),
    ].toSorted((a, b) => a.at - b.at),
  };
  return ok(view);
}
