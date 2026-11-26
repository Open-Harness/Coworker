import type { Ctx } from "./check-context.ts";
import { checkPerson } from "./check-context.ts";
import { linesOf } from "./lines.ts";

const MAX_PAGE_LINES = 120;

/** Lines of a page as it is counted: by its newlines; a last one that ends the page starts nothing. */
export function pageLines(page: string): number {
  if (page === "") return 0;
  return page.split("\n").length - (page.endsWith("\n") ? 1 : 0);
}

export function checkPage(c: Ctx): void {
  const n = pageLines(c.p.page);
  if (n > MAX_PAGE_LINES) c.say("SKILL.md", "page", `The page is ${n} lines: it may be at most ${MAX_PAGE_LINES}.`);
}

/** Each part that needs an eval, with the file it is in and what to call it. */
function needsEval(c: Ctx): readonly { readonly of: string; readonly at: string; readonly name: string }[] {
  const p = c.p;
  return [
    ...p.kinds.flatMap((k) =>
      k.steps.map((s) => ({ of: `workflow/${k.id}/${s.id}`, at: "workflow.yaml", name: `The step ${s.id} of ${k.id}` })),
    ),
    ...p.agents.map((a) => ({ of: `agents/${a.id}`, at: `agents/${a.id}.md`, name: `The agent ${a.id}` })),
    ...p.skills
      .filter((s) => s.from === "here" && s.layer === "craft")
      .map((s) => ({ of: `skills/${s.id}`, at: `skills/${s.id}/SKILL.md`, name: `The skill ${s.id}` })),
    ...p.triggers.filter((t) => t.by === "cron").map((t) => ({ of: `triggers/${t.id}`, at: "triggers.yaml", name: `The trigger ${t.id}` })),
  ];
}

export function checkEvals(c: Ctx): void {
  const judged = new Set(c.p.evals.map((e) => e.of));
  for (const need of needsEval(c))
    if (!judged.has(need.of)) c.say(need.at, need.of, `${need.name} has no eval: nothing says how well it works.`);
  const known = new Set(["playbook", ...linesOf(c.p).map((l) => l.line)]);
  for (const e of c.p.evals) {
    const at = `evals/${e.id}.yaml`;
    const line = `evals/${e.id}`;
    if (!known.has(e.of)) c.say(at, line, `The eval ${e.id} is about ${e.of}, which is not there.`);
    if (typeof e.judge !== "string" && "person" in e.judge)
      checkPerson(c, at, line, e.judge.person, `The eval ${e.id} is judged by a person: it`);
  }
}

/** Every line that needs a reason: the page, the objective, each kind, step, trigger, agent, skill of its own, grant and eval. */
export function checkBecause(c: Ctx): void {
  const p = c.p;
  const wanted = [
    "page",
    "objective",
    ...p.kinds.flatMap((k) => [`workflow/${k.id}`, ...k.steps.map((s) => `workflow/${k.id}/${s.id}`)]),
    ...p.triggers.map((t) => `triggers/${t.id}`),
    ...p.agents.map((a) => `agents/${a.id}`),
    ...p.skills.filter((s) => s.from === "here").map((s) => `skills/${s.id}`),
    ...p.reach.grants.map((g) => `reach/${g.account}/${g.place}`),
    ...p.evals.map((e) => `evals/${e.id}`),
  ];
  for (const line of new Set(wanted))
    if (!Object.hasOwn(p.because, line)) c.say("because.yaml", line, `Nothing says why ${line} is there: give a reason in because.yaml.`);
}
