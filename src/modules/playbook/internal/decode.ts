import type { AgentRole, Because, Kind, ModelChoice, Playbook, Problem, Skill, Step, Trigger } from "../types.ts";
import { frontValue, splitFront } from "./front.ts";
import { BAD, isRecord, obj, rootWhere, say } from "./schema.ts";
import type { Bad, Sch } from "./schema.ts";
import { aimSch, askRuleSch, becauseSch, evalSch, measureSch, notWorseSch, ownSkillSch, usedSkillSch } from "./shapes.ts";
import { agentHeadShape, grantSch, kindHeadSch, limitsSch, modelSch, stepSch, triggerSch } from "./shapes-workflow.ts";
import type { Entry } from "./table.ts";
import { skillPage } from "./table.ts";
import { parseYaml } from "./yaml.ts";

/* The inverse of `tableOf`: the lines, as they stand now, back into a playbook, or into the problems of the lines that are not right. */

export type Decoded = { readonly ok: true; readonly playbook: Playbook } | { readonly ok: false; readonly problems: readonly Problem[] };

/** The file a line lives in. */
export function fileOf(key: string, text = ""): string {
  const parts = key.split("/");
  const id = parts[1] ?? "";
  if (key.startsWith("~because/")) return "because.yaml";
  if (key.startsWith("~file/")) return key.slice(6);
  if (key === "~name") return "SKILL.md";
  switch (parts[0]) {
    case "page":
      return "SKILL.md";
    case "objective":
      return "objective.yaml";
    case "workflow":
      return "workflow.yaml";
    case "triggers":
      return "triggers.yaml";
    case "agents":
      return `agents/${id}.md`;
    case "skills":
      return text.startsWith("---") ? skillPage(id) : "skills.yaml";
    case "evals":
      return `evals/${id}.yaml`;
    default:
      return "reach.yaml";
  }
}

/** The text of a line as a value of the shape `sch`; `id` is the name the line has, put into the value. */
function valueOf<T>(e: Entry, sink: Problem[], sch: Sch<T>, id?: string): T | Bad {
  const w = rootWhere(sink, fileOf(e.key, e.text), e.key.startsWith("~") ? undefined : e.key);
  const parsed = parseYaml(e.text);
  if (!parsed.ok) {
    for (const says of parsed.says) say(w, `The line ${e.key}: ${says}`);
    return BAD;
  }
  const raw = parsed.value;
  return sch(id !== undefined && isRecord(raw) ? { ...raw, id } : raw, w);
}

function ownSkill(e: Entry, id: string, sink: Problem[]): { skill: Skill; body: string } | Bad {
  const w = rootWhere(sink, fileOf(e.key, e.text), e.key);
  const split = splitFront(e.text);
  if (split._tag !== "Split") return say(w, `The line ${e.key} must be a SKILL.md: front matter between two lines of ---, then the text.`);
  const front = frontValue(split.front);
  if (!front.ok) return say(w, `The line ${e.key}: ${front.says[0] ?? "the front matter cannot be read."}`);
  const made = ownSkillSch(front.value, w);
  return made === BAD ? BAD : { skill: { id, name: made.name, layer: made.layer, says: made.says, from: "here" }, body: split.body };
}

interface Pieces {
  said?: string;
  owner?: string;
  measure?: Playbook["objective"]["measure"];
  aim?: Playbook["objective"]["aim"];
  limits?: Playbook["reach"]["limits"];
  name?: string;
  readonly pageTexts: string[];
  readonly notWorse: Playbook["objective"]["notWorse"][number][];
  readonly kinds: Map<string, { head: Omit<Kind, "steps">; steps: Step[] }>;
  readonly steps: { readonly entry: Entry; readonly kind: string; readonly step: Step }[];
  readonly triggers: Trigger[];
  readonly agents: Map<string, { head?: Omit<AgentRole, "id" | "told" | "model">; told?: string; model?: ModelChoice }>;
  readonly skills: Skill[];
  readonly skillFiles: Record<string, string>;
  readonly grants: Playbook["reach"]["grants"][number][];
  readonly mayAsk: Playbook["reach"]["mayAsk"][number][];
  readonly never: string[];
  readonly evals: Playbook["evals"][number][];
  readonly because: [string, Because][];
}

const idAfter = (key: string, prefix: string): string => key.slice(prefix.length);

function take(e: Entry, sink: Problem[], into: Pieces): void {
  const parts = e.key.split("/");
  const w = rootWhere(sink, fileOf(e.key, e.text), e.key);
  const put = <T>(sch: Sch<T>, id?: string): T | Bad => valueOf(e, sink, sch, id);
  const text = e.text;
  if (e.key === "~name") into.name = text;
  else if (e.key.startsWith("~because/")) {
    const line = e.key.slice(9);
    const b = valueOf(e, sink, becauseSch);
    if (b !== BAD) into.because.push([line, b]);
  } else if (e.key.startsWith("~file/")) into.skillFiles[e.key.slice(6)] = text;
  else if (parts[0] === "page") into.pageTexts.push(text);
  else if (e.key === "objective") return;
  else if (e.key === "objective/said") into.said = text;
  else if (e.key === "objective/owner") into.owner = text;
  else if (e.key === "objective/measure") {
    const m = put(measureSch);
    if (m !== BAD) into.measure = m;
  } else if (e.key === "objective/aim") {
    const a = put(aimSch);
    if (a !== BAD) into.aim = a;
  } else if (parts[0] === "objective") {
    const n = put(notWorseSch);
    if (n !== BAD) into.notWorse.push(n);
  } else if (parts[0] === "workflow" && parts.length === 2) {
    const head = put(kindHeadSch, parts[1]);
    if (head !== BAD) into.kinds.set(head.id, { head, steps: [] });
  } else if (parts[0] === "workflow") {
    const step = put(stepSch, parts[2]);
    if (step !== BAD) into.steps.push({ entry: e, kind: parts[1] ?? "", step });
  } else if (parts[0] === "triggers") {
    const t = put(triggerSch, idAfter(e.key, "triggers/"));
    if (t !== BAD) into.triggers.push(t);
  } else if (parts[0] === "agents") agentPiece(e, parts, sink, into);
  else if (parts[0] === "skills") skillPiece(e, sink, into);
  else if (e.key === "reach/limits") {
    const l = put(limitsSch);
    if (l !== BAD) into.limits = l;
  } else if (e.key.startsWith("reach/mayAsk/")) {
    const r = put(askRuleSch);
    if (r !== BAD) into.mayAsk.push(r);
  } else if (e.key.startsWith("reach/never/")) into.never.push(text);
  else if (parts[0] === "reach") {
    const g = put(grantSch);
    if (g !== BAD) into.grants.push(g);
  } else if (parts[0] === "evals") {
    const made = put(evalSch);
    if (made !== BAD) into.evals.push({ id: idAfter(e.key, "evals/"), ...made });
  } else say(w, `The line ${e.key} is not a line of a playbook.`);
}

function agentPiece(e: Entry, parts: readonly string[], sink: Problem[], into: Pieces): void {
  const id = parts[1] ?? "";
  const one = into.agents.get(id) ?? {};
  into.agents.set(id, one);
  if (parts.length === 2) {
    const head = valueOf(e, sink, obj("an agent", agentHeadShape));
    if (head !== BAD) one.head = head;
  } else if (parts[2] === "told") one.told = e.text;
  else if (parts[2] === "model") {
    const model = valueOf(e, sink, modelSch);
    if (model !== BAD) one.model = model;
  } else say(rootWhere(sink, fileOf(e.key), e.key), `The line ${e.key} is not a line of an agent.`);
}

function skillPiece(e: Entry, sink: Problem[], into: Pieces): void {
  const id = idAfter(e.key, "skills/");
  if (e.text.startsWith("---")) {
    const made = ownSkill(e, id, sink);
    if (made === BAD) return;
    into.skills.push(made.skill);
    into.skillFiles[skillPage(id)] = made.body;
  } else {
    const made = valueOf(e, sink, usedSkillSch, id);
    if (made !== BAD) into.skills.push(made);
  }
}

function lacks(sink: Problem[], at: string, line: string, what: string): void {
  sink.push({ at, line, says: `The line ${line} is missing: ${what}.` });
}

function joinPage(texts: readonly string[]): string {
  let page = "";
  for (const t of texts) page += page !== "" && !page.endsWith("\n") && t.startsWith("## ") ? `\n${t}` : t;
  return page;
}

export function decodeTable(entries: readonly Entry[]): Decoded {
  const sink: Problem[] = [];
  const into: Pieces = {
    pageTexts: [],
    notWorse: [],
    kinds: new Map(),
    steps: [],
    triggers: [],
    agents: new Map(),
    skills: [],
    skillFiles: {},
    grants: [],
    mayAsk: [],
    never: [],
    evals: [],
    because: [],
  };
  for (const e of entries) take(e, sink, into);
  for (const { entry, kind, step } of into.steps) {
    const home = into.kinds.get(kind);
    if (home === undefined)
      sink.push({ at: "workflow.yaml", line: entry.key, says: `The step ${entry.key} is of a kind that is not there.` });
    else home.steps.push(step);
  }
  const agents: AgentRole[] = [];
  for (const [id, one] of into.agents) {
    if (one.head === undefined) lacks(sink, `agents/${id}.md`, `agents/${id}`, "the agent has no name, no `is`, no skills and no tools");
    else if (one.told === undefined) lacks(sink, `agents/${id}.md`, `agents/${id}/told`, "what the agent is told");
    else if (one.model === undefined) lacks(sink, `agents/${id}.md`, `agents/${id}/model`, "the model of the agent");
    else agents.push({ id, ...one.head, told: one.told, model: one.model });
  }
  if (into.name === undefined) sink.push({ at: "SKILL.md", says: "The playbook has no name." });
  const o = into;
  if (o.said === undefined) lacks(sink, "objective.yaml", "objective/said", "the person's own words");
  if (o.owner === undefined) lacks(sink, "objective.yaml", "objective/owner", "who answers for it");
  if (o.measure === undefined && !sink.some((p) => p.line === "objective/measure"))
    lacks(sink, "objective.yaml", "objective/measure", "what is measured");
  if (o.aim === undefined && !sink.some((p) => p.line === "objective/aim"))
    lacks(sink, "objective.yaml", "objective/aim", "what it aims at");
  if (o.limits === undefined && !sink.some((p) => p.line === "reach/limits"))
    lacks(sink, "reach.yaml", "reach/limits", "the limits of the reach");
  if (
    sink.length > 0 ||
    o.name === undefined ||
    o.said === undefined ||
    o.owner === undefined ||
    o.measure === undefined ||
    o.aim === undefined ||
    o.limits === undefined
  )
    return { ok: false, problems: sink };
  const kinds: Kind[] = [...o.kinds.values()].map((k) => ({ ...k.head, steps: k.steps }));
  const playbook: Playbook = {
    name: o.name,
    page: joinPage(o.pageTexts),
    objective: { said: o.said, measure: o.measure, aim: o.aim, notWorse: o.notWorse, owner: o.owner },
    kinds,
    triggers: o.triggers,
    agents,
    skills: o.skills,
    skillFiles: o.skillFiles,
    reach: { grants: o.grants, limits: o.limits, mayAsk: o.mayAsk, never: o.never },
    evals: o.evals,
    because: Object.fromEntries(o.because),
  };
  return { ok: true, playbook };
}
