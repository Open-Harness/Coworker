import { templates } from "~/modules/templates/service.ts";
import type { Comment, IntakeView, PlaybookView } from "~/modules/views-manager/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { problem, ok } from "./around.ts";
import { headOf, openManager, type Open } from "./managers.ts";
import type { Decision } from "~/modules/intake/types.ts";

/* What one manager's pages are given. */

const gone = (id: string) => problem(404, `There is no manager "${id}" here.`);

const owner = (open: Open): string => open.playbook?.objective.owner ?? open.version.by;

async function agentsOf(c: ConsoleDeps, open: Open): Promise<PlaybookView["agents"]> {
  const choice = (await c.store.setting("choice")) as { connection?: string; model?: string } | null | undefined;
  const inherited = choice?.connection === undefined ? "No model chosen yet" : `${choice.connection} ${choice.model}`;
  return (open.playbook?.agents ?? []).map((agent) => ({
    agent,
    model: agent.model === "inherit" ? inherited : `${agent.model.connection} ${agent.model.model}`,
    from: agent.model === "inherit" ? "workspace" : "agent",
    shared: null,
  }));
}

export async function playbookView(c: ConsoleDeps, id: string, wanted: number | undefined) {
  const open = await openManager(c, id, wanted);
  if (open === undefined) return gone(id);
  const { playbook } = open;
  if (playbook === null) return problem(422, `The playbook does not read: ${open.problems[0]?.says ?? "it has a problem"}`);
  const template = c.ours.find(({ id: one }) => one === open.row.node.template?.id);
  const copy = await open.store.copy();
  const newer =
    template === undefined || copy === undefined || copy.template === null
      ? null
      : templates.newer({ template: copy.template.id, version: copy.template.version, given: copy.given, now: copy.now }, template);
  const view: PlaybookView = {
    head: await headOf(c, open),
    draft: false,
    playbook,
    files: open.version.files,
    version: open.version.number,
    problems: open.problems,
    comments: (await open.store.kept("comment")) as readonly Comment[],
    because: playbook.because,
    evals: playbook.evals.map((one) => ({
      eval: one,
      now: null,
      seen: 0,
      was: null,
      how: typeof one.judge === "string" ? "Code" : "A person",
    })),
    triggers: playbook.triggers.map((trigger) => ({
      trigger,
      came: 0,
      took: 0,
      cost: 0,
      next: null,
      from: trigger.by,
      says: trigger.name,
      most: trigger.atMost === "no limit" ? "No limit" : `${trigger.atMost.count} a ${trigger.atMost.a}`,
    })),
    agents: await agentsOf(c, open),
    skills: playbook.skills.map((skill) => ({ ...skill, with: null, without: null, of: null, by: [], left: null, also: [] })),
    accounts: playbook.reach.grants.map(({ account }) => ({ account, state: "works", person: null })),
    steps: {},
    record: {},
    worse: [],
    saidBy: { person: owner(open), at: open.version.at },
    cases: { shown: [], total: 0 },
    past: null,
    newer:
      newer === null || newer._tag === "Same"
        ? null
        : { template: template?.id ?? "", version: newer.version, changes: newer.changes.length },
  };
  return ok(view);
}

const LIMIT = 50;

/** What intake did, as a correction says it: took on, left, or asked. */
export const didOf = (decision: Decision): string =>
  decision._tag === "Took" || decision._tag === "Joined"
    ? "took"
    : decision._tag === "Left"
      ? "left"
      : decision._tag === "Asked"
        ? "asked"
        : "none";

/** A person's word on a decision: right when it is what they say it should have been. Nothing until it is decided. */
const saidOf = (should: string | undefined, decision: Decision | null): "right" | "wrong" | null =>
  should === undefined || decision === null ? null : should === didOf(decision) ? "right" : "wrong";

/** Until a judge has been asked, what is said of an item is that: it is kept, and nothing has been decided. */
const waiting = (item: string): Decision => ({ item, gated: [], verdicts: [], why: "Not decided yet", _tag: "CouldNot" });

export async function intakeView(c: ConsoleDeps, id: string, query: URLSearchParams) {
  const open = await openManager(c, id);
  if (open === undefined) return gone(id);
  const found = await c.store.items(id, { from: query.get("from") || null, before: query.get("before") || null, limit: LIMIT });
  const head = await headOf(c, open);
  const corrected = new Map(
    ((await c.store.kept("correction")) as readonly { manager: string; item: string; should: string }[]).map((one) => [
      `${one.manager}:${one.item}`,
      one.should,
    ]),
  );
  const view: IntakeView = {
    head,
    rows: found.rows.map(({ item, decision }) => ({
      item,
      decision: decision ?? waiting(item.id),
      work:
        decision?._tag === "Took"
          ? { id: `work_${item.id}`, title: item.title }
          : decision?._tag === "Joined"
            ? { id: decision.work, title: item.title }
            : null,
      from: item.actor.name,
      line: [{ did: "Found", says: `${item.actor.name} on ${item.place}`, at: item.at }],
      said: saidOf(corrected.get(`${id}:${item.id}`), decision),
      versions: { [id]: head.version },
      mandate: null,
    })),
    triggers: (open.playbook?.triggers ?? []).map((trigger) => ({ trigger, came: 0, took: 0, cost: 0, next: null, from: trigger.by })),
    kinds: open.playbook?.kinds ?? [],
    next: found.next,
  };
  return ok(view);
}
