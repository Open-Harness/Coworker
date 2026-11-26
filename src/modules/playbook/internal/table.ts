import type { Playbook } from "../types.ts";
import { joinFront } from "./front.ts";
import {
  agentHeadPlain,
  askRulePlain,
  becausePlain,
  evalPlain,
  grantPlain,
  kindHeadPlain,
  limitsPlain,
  modelPlain,
  notWorsePlain,
  aimPlain,
  measurePlain,
  ownSkillFront,
  stepPlain,
  triggerPlain,
  usedSkillPlain,
} from "./plain.ts";
import { dump } from "./yaml.ts";

/*
 * A playbook as a table of lines: each has a name (`workflow/bug/build`) and a text. `shown` lines are what a person can comment on;
 * the rest (the name of the playbook, why a line is there, the files beside a skill) go along so that nothing is lost.
 */

export interface Entry {
  readonly key: string;
  readonly text: string;
  readonly shown: boolean;
}

function withoutId(value: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const { id: _id, ...rest } = value;
  return rest;
}

const headingOf = (line: string): string | undefined => /^## +(\S.*?)\s*$/u.exec(line)?.[1];

/** The page cut where each `##` heading starts: the part before the first, then each section with its heading, exactly. */
export function pageParts(page: string): readonly { readonly key: string; readonly text: string }[] {
  const cuts: { at: number; name: string }[] = [];
  let offset = 0;
  for (const line of page.split("\n")) {
    const name = headingOf(line);
    if (name !== undefined) cuts.push({ at: offset, name });
    offset += line.length + 1;
  }
  const seen = new Map<string, number>();
  const parts = [{ key: "page", text: page.slice(0, cuts[0]?.at ?? page.length) }];
  for (const [i, cut] of cuts.entries()) {
    const times = (seen.get(cut.name) ?? 0) + 1;
    seen.set(cut.name, times);
    parts.push({ key: `page/${cut.name}${times > 1 ? ` (${times})` : ""}`, text: page.slice(cut.at, cuts[i + 1]?.at ?? page.length) });
  }
  return parts;
}

export const skillPage = (id: string): string => `skills/${id}/SKILL.md`;

export function tableOf(p: Playbook): readonly Entry[] {
  const out: Entry[] = [];
  const add = (key: string, text: string, shown = true): void => void out.push({ key, text, shown });
  for (const part of pageParts(p.page)) add(part.key, part.text);
  add("objective", "");
  add("objective/said", p.objective.said);
  add("objective/measure", dump(measurePlain(p.objective.measure)));
  add("objective/aim", dump(aimPlain(p.objective.aim)));
  for (const [i, n] of p.objective.notWorse.entries()) add(`objective/notWorse/${i + 1}`, dump(notWorsePlain(n)));
  add("objective/owner", p.objective.owner);
  for (const k of p.kinds) {
    add(`workflow/${k.id}`, dump(withoutId(kindHeadPlain(k))));
    for (const s of k.steps) add(`workflow/${k.id}/${s.id}`, dump(withoutId(stepPlain(s))));
  }
  for (const t of p.triggers) add(`triggers/${t.id}`, dump(withoutId(triggerPlain(t))));
  for (const a of p.agents) {
    add(`agents/${a.id}`, dump(agentHeadPlain(a)));
    add(`agents/${a.id}/told`, a.told);
    add(`agents/${a.id}/model`, a.model === "inherit" ? "inherit" : dump(modelPlain(a.model)));
  }
  for (const s of p.skills)
    add(
      `skills/${s.id}`,
      s.from === "here" ? joinFront(ownSkillFront(s), p.skillFiles[skillPage(s.id)] ?? "") : dump(withoutId(usedSkillPlain(s))),
    );
  for (const g of p.reach.grants) add(`reach/${g.account}/${g.place}`, dump(grantPlain(g)));
  add("reach/limits", dump(limitsPlain(p.reach.limits)));
  for (const r of p.reach.mayAsk) add(`reach/mayAsk/${r.account}/${r.place}`, dump(askRulePlain(r)));
  for (const [i, n] of p.reach.never.entries()) add(`reach/never/${i + 1}`, n);
  for (const { id, ...e } of p.evals) add(`evals/${id}`, dump(evalPlain(e)));
  add("~name", p.name, false);
  for (const [line, b] of Object.entries(p.because)) add(`~because/${line}`, dump(becausePlain(b)), false);
  const own = new Set(p.skills.filter((s) => s.from === "here").map((s) => skillPage(s.id)));
  for (const [path, text] of Object.entries(p.skillFiles)) if (!own.has(path)) add(`~file/${path}`, text, false);
  return out;
}
