import type { AgentRole, Because, Files, Kind, Playbook, Problem, ReachFile, ReadPlaybook, Skill } from "../types.ts";
import { frontValue, splitFront } from "./front.ts";
import { aimSch, becauseSch, evalSch, measureSch, notWorseSch, ownSkillSch, reachSch, usedSkillSch } from "./shapes.ts";
import { agentFrontSch, kindOf, stepSch, triggerSch } from "./shapes-workflow.ts";
import { BAD, arr, child, idOf, lined, obj, req, rootWhere, say, str } from "./schema.ts";
import type { Bad, Sch, Where } from "./schema.ts";
import { parseYaml } from "./yaml.ts";

/* The files of a playbook into one value, or into every problem there is, each with its file and the thing it is in. */

const named = (prefix: string) => (value: unknown) => {
  const id = idOf(value);
  return id === undefined ? undefined : `${prefix}/${id}`;
};
const nth = (w: Where): number => {
  const last = w.trail[w.trail.length - 1];
  return typeof last === "number" ? last + 1 : 0;
};
const sorted = <T extends { readonly id: string }>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

/** A file that holds YAML: its value, nothing when it is not there and may be, or BAD (said). */
function yamlFile(files: Files, at: string, sink: Problem[], required: boolean): unknown | Bad | undefined {
  const text = files[at];
  if (text === undefined) {
    if (required) sink.push({ at, says: `The file ${at} is missing.` });
    return required ? BAD : undefined;
  }
  const parsed = parseYaml(text);
  if (parsed.ok) return parsed.value;
  for (const says of parsed.says) sink.push({ at, says });
  return BAD;
}

/** Two grants, or two rules of who may ask, for the same place of one account: said at the line of the second. */
function noTwinPlaces(reach: ReachFile, where: Where): void {
  const grants = new Set<string>();
  for (const g of reach.grants) {
    const line = `reach/${g.account}/${g.place}`;
    if (grants.has(line)) say({ ...where, line }, `There are two grants for ${g.place} of ${g.account}.`);
    grants.add(line);
  }
  const rules = new Set<string>();
  for (const r of reach.mayAsk) {
    const line = `reach/mayAsk/${r.account}/${r.place}`;
    if (rules.has(line)) say({ ...where, line }, `There are two rules of who may ask in ${r.place} of ${r.account}.`);
    rules.add(line);
  }
}

/** Two of one thing with the same name: said at each. */
function noTwins(items: readonly { readonly id: string }[], label: string, where: Where, line: (id: string) => string): void {
  const seen = new Set<string>();
  for (const { id } of items) {
    if (seen.has(id)) say({ ...where, line: line(id) }, `There are two ${label} called ${id}.`);
    seen.add(id);
  }
}

function fileValue<T>(files: Files, at: string, sink: Problem[], required: boolean, sch: Sch<T>): T | Bad | undefined {
  const raw = yamlFile(files, at, sink, required);
  return raw === BAD || raw === undefined ? raw : sch(raw, rootWhere(sink, at));
}

const objectiveSch = obj("the objective", {
  said: req(lined(() => "objective/said", str)),
  measure: req(lined(() => "objective/measure", measureSch)),
  aim: req(lined(() => "objective/aim", aimSch)),
  notWorse: req(arr(lined((_, w) => `objective/notWorse/${nth(w)}`, notWorseSch))),
  owner: req(lined(() => "objective/owner", str)),
});
const kindFileSch: Sch<Kind> = lined(named("workflow"), kindOf(arr(lined((value, w) => `${w.line}/${idOf(value) ?? ""}`, stepSch))));

function readWorkflow(files: Files, sink: Problem[]): readonly Kind[] | Bad {
  const found = fileValue(files, "workflow.yaml", sink, true, obj("workflow.yaml", { kinds: req(arr(kindFileSch)) }));
  if (found === BAD || found === undefined) return BAD;
  const w = rootWhere(sink, "workflow.yaml");
  noTwins(found.kinds, "kinds", w, (id) => `workflow/${id}`);
  for (const k of found.kinds) noTwins(k.steps, "steps", w, (id) => `workflow/${k.id}/${id}`);
  return found.kinds;
}

/** Front matter and a body: the file's own problems are said here. */
function frontFile<T>(files: Files, at: string, line: string | undefined, sink: Problem[], sch: Sch<T>): { front: T; body: string } | Bad {
  const w = rootWhere(sink, at, line);
  const split = splitFront(files[at] ?? "");
  if (split._tag === "Without") return say(w, `The file ${at} has no front matter: it must start with a line of ---.`);
  if (split._tag === "Open") return say(w, `The front matter of ${at} never closes: it needs a second line of ---.`);
  const parsed = frontValue(split.front);
  if (!parsed.ok) {
    for (const says of parsed.says) say(w, says);
    return BAD;
  }
  const front = sch(parsed.value, w);
  return front === BAD ? BAD : { front, body: split.body };
}

function readAgents(files: Files, sink: Problem[]): readonly AgentRole[] | Bad {
  const out: AgentRole[] = [];
  let bad = false;
  for (const at of Object.keys(files)) {
    const id = /^agents\/([^/]+)\.md$/u.exec(at)?.[1];
    if (id === undefined) continue;
    const made = frontFile(files, at, `agents/${id}`, sink, agentFrontSch);
    if (made === BAD) bad = true;
    else
      out.push({
        id,
        name: made.front.name,
        is: made.front.is,
        told: made.body,
        skills: made.front.skills,
        tools: made.front.tools,
        model: made.front.model,
      });
  }
  return bad ? BAD : sorted(out);
}

function readSkills(files: Files, sink: Problem[]): { skills: readonly Skill[]; skillFiles: Files } | Bad {
  const used = fileValue(files, "skills.yaml", sink, false, obj("skills.yaml", { use: req(arr(lined(named("skills"), usedSkillSch))) }));
  let bad = used === BAD;
  const own: Skill[] = [];
  const skillFiles: Record<string, string> = {};
  for (const [at, text] of Object.entries(files)) {
    if (!at.startsWith("skills/")) continue;
    const id = /^skills\/([^/]+)\/SKILL\.md$/u.exec(at)?.[1];
    if (id === undefined) {
      skillFiles[at] = text;
      continue;
    }
    const made = frontFile(files, at, `skills/${id}`, sink, ownSkillSch);
    if (made === BAD) bad = true;
    else {
      own.push({ id, name: made.front.name, layer: made.front.layer, says: made.front.says, from: "here" });
      skillFiles[at] = made.body;
    }
  }
  if (bad) return BAD;
  const listed = used === undefined || used === BAD ? [] : used.use;
  const all = [...sorted(own), ...listed];
  noTwins(all, "skills", rootWhere(sink, "skills.yaml"), (id) => `skills/${id}`);
  return { skills: all, skillFiles };
}

function readEvals(files: Files, sink: Problem[]): Playbook["evals"] | Bad {
  const out: Playbook["evals"][number][] = [];
  let bad = false;
  for (const at of Object.keys(files)) {
    const id = /^evals\/([^/]+)\.yaml$/u.exec(at)?.[1];
    if (id === undefined) continue;
    const raw = yamlFile(files, at, sink, true);
    const made = raw === BAD ? BAD : evalSch(raw, rootWhere(sink, at, `evals/${id}`));
    if (made === BAD) bad = true;
    else out.push({ id, ...made });
  }
  return bad ? BAD : sorted(out);
}

function readBecause(files: Files, sink: Problem[]): Playbook["because"] | Bad {
  const w = rootWhere(sink, "because.yaml");
  const raw = yamlFile(files, "because.yaml", sink, false);
  if (raw === BAD) return BAD;
  if (raw === undefined) return {};
  const entries = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? Object.entries(raw) : undefined;
  if (entries === undefined) return say(w, "The file because.yaml must be a mapping of lines to reasons.");
  const out: [string, Because][] = [];
  let bad = false;
  for (const [line, value] of entries) {
    const made = becauseSch(value, { ...child(w, line), line });
    if (made === BAD) bad = true;
    else out.push([line, made]);
  }
  return bad ? BAD : Object.fromEntries(out);
}

function readPage(files: Files, sink: Problem[]): { name: string; page: string } | Bad {
  if (files["SKILL.md"] === undefined) return say(rootWhere(sink, "SKILL.md"), "The file SKILL.md is missing.");
  const made = frontFile(files, "SKILL.md", undefined, sink, obj("the front matter", { name: req(str) }));
  return made === BAD ? BAD : { name: made.front.name, page: made.body };
}

function readAll(files: Files): ReadPlaybook {
  const sink: Problem[] = [];
  const page = readPage(files, sink);
  const objective = fileValue(files, "objective.yaml", sink, true, objectiveSch);
  const kinds = readWorkflow(files, sink);
  const triggers = fileValue(
    files,
    "triggers.yaml",
    sink,
    true,
    obj("triggers.yaml", { triggers: req(arr(lined(named("triggers"), triggerSch))) }),
  );
  if (triggers !== BAD && triggers !== undefined)
    noTwins(triggers.triggers, "triggers", rootWhere(sink, "triggers.yaml"), (id) => `triggers/${id}`);
  const agents = readAgents(files, sink);
  const skills = readSkills(files, sink);
  const reach = fileValue(files, "reach.yaml", sink, true, reachSch);
  if (reach !== BAD && reach !== undefined) noTwinPlaces(reach, rootWhere(sink, "reach.yaml"));
  const evals = readEvals(files, sink);
  const because = readBecause(files, sink);
  if (sink.length > 0) return { _tag: "Problems", problems: sink };
  if (
    page === BAD ||
    objective === BAD ||
    objective === undefined ||
    kinds === BAD ||
    triggers === BAD ||
    triggers === undefined ||
    agents === BAD ||
    skills === BAD ||
    reach === BAD ||
    reach === undefined ||
    evals === BAD ||
    because === BAD
  )
    return { _tag: "Problems", problems: [{ at: "SKILL.md", says: "The playbook could not be read." }] };
  const playbook: Playbook = {
    name: page.name,
    page: page.page,
    objective,
    kinds,
    triggers: triggers.triggers,
    agents,
    skills: skills.skills,
    skillFiles: skills.skillFiles,
    reach,
    evals,
    because,
  };
  return { _tag: "Playbook", playbook };
}

/** `read` never throws: what it could not take is a problem. */
export function readFiles(files: Files): ReadPlaybook {
  try {
    return readAll(files);
  } catch {
    return { _tag: "Problems", problems: [{ at: "SKILL.md", says: "The playbook is too much to read." }] };
  }
}
