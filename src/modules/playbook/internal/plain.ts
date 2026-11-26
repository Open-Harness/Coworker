import type {
  AgentRole,
  AskRule,
  Because,
  Check,
  Eval,
  Kind,
  Measure,
  ModelChoice,
  Objective,
  ReachFile,
  Skill,
  Step,
  Trigger,
} from "../types.ts";
import type { Limits } from "~/modules/reach/types.ts";

/*
 * Every value of a playbook as plain data with its keys in the order they are written in, and only the keys it has. What is written
 * and what a line says is made here, so the same playbook is the same text whatever order its keys were made in.
 */

type Plain = Readonly<Record<string, unknown>>;

export function limitsPlain(l: Limits): Plain {
  const out: Record<string, number> = {};
  for (const key of ["perWork", "perDay", "perMonth", "hours", "atOnce"] as const) {
    const value = l[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export const checkPlain = (c: Check): Plain => ({ id: c.id, says: c.says, by: c.by, ...(c.run === undefined ? {} : { run: c.run }) });
const endPlain = (e: { readonly ask: string } | { readonly drop: string }): Plain => ("ask" in e ? { ask: e.ask } : { drop: e.drop });

function whoPlain(w: Step["by"] | Step["checkedBy"]): Plain {
  if ("agent" in w) return { agent: w.agent };
  if ("person" in w) return { person: w.person };
  return "manager" in w ? { manager: true } : { code: true };
}
const otherwisePlain = (o: Step["otherwise"]): Plain =>
  "back" in o ? { back: o.back, times: o.times, then: endPlain(o.then) } : endPlain(o);

export const stepPlain = (s: Step): Plain => ({
  id: s.id,
  name: s.name,
  by: whoPlain(s.by),
  does: s.does,
  skills: [...s.skills],
  leaves: s.leaves.map(checkPlain),
  checkedBy: whoPlain(s.checkedBy),
  otherwise: otherwisePlain(s.otherwise),
});

export const grantPlain = (g: Kind["may"][number]): Plain => ({ account: g.account, place: g.place, may: { ...g.may } });

export const kindHeadPlain = (k: Kind): Plain => ({
  id: k.id,
  name: k.name,
  when: k.when,
  alone: k.alone,
  doneWhen: k.doneWhen.map(checkPlain),
  may: k.may.map(grantPlain),
  limits: limitsPlain(k.limits),
  look: k.look,
});
export const kindPlain = (k: Kind): Plain => ({
  id: k.id,
  name: k.name,
  when: k.when,
  alone: k.alone,
  steps: k.steps.map(stepPlain),
  doneWhen: k.doneWhen.map(checkPlain),
  may: k.may.map(grantPlain),
  limits: limitsPlain(k.limits),
  look: k.look,
});

export function triggerPlain(t: Trigger): Plain {
  const makes = typeof t.makes === "string" ? t.makes : "kind" in t.makes ? { kind: t.makes.kind } : { kinds: t.makes.kinds };
  const atMost = typeof t.atMost === "string" ? t.atMost : { a: t.atMost.a, count: t.atMost.count };
  const head = { id: t.id, name: t.name, on: t.on, makes, only: t.only, atMost, by: t.by };
  switch (t.by) {
    case "cron":
      return {
        ...head,
        when: { cron: t.when.cron, zone: t.when.zone },
        agent: t.agent,
        brief: t.brief,
        finds: [...t.finds],
        same: [...t.same],
      };
    case "event":
      return { ...head, account: t.account, place: t.place, events: [...t.events] };
    case "wait":
      return { ...head, for: t.for, of: t.of, holds: t.holds, account: t.account };
    case "asked":
      return { ...head, where: t.where };
  }
}

export const modelPlain = (m: ModelChoice): unknown =>
  m === "inherit" ? "inherit" : { connection: m.connection, model: m.model, thinking: m.thinking };
export const agentHeadPlain = (a: AgentRole): Plain => ({ name: a.name, is: a.is, skills: [...a.skills], tools: [...a.tools] });
export const agentFrontPlain = (a: AgentRole): Plain => ({ ...agentHeadPlain(a), model: modelPlain(a.model) });

export const measurePlain = (m: Measure): Plain => ({
  counts: m.counts,
  unit: m.unit,
  better: m.better,
  read:
    m.read.from === "connector"
      ? { from: "connector", account: m.read.account, query: m.read.query }
      : { from: "person", person: m.read.person, asks: m.read.asks },
  settles: m.settles,
  before: "unknown" in m.before ? { unknown: m.before.unknown } : { value: m.before.value, at: m.before.at },
});
export const aimPlain = (a: Objective["aim"]): Plain => ({ value: a.value, by: a.by });
export const notWorsePlain = (n: Objective["notWorse"][number]): Plain => ({ measure: measurePlain(n.measure), limit: n.limit });
export const objectivePlain = (o: Objective): Plain => ({
  said: o.said,
  measure: measurePlain(o.measure),
  aim: aimPlain(o.aim),
  notWorse: o.notWorse.map(notWorsePlain),
  owner: o.owner,
});

export const askRulePlain = (r: AskRule): Plain => ({
  account: r.account,
  place: r.place,
  listed: { who: typeof r.listed.who === "string" ? r.listed.who : [...r.listed.who] },
  others: r.others,
  overheard: r.overheard,
  bots: [...r.bots],
});
export const reachPlain = (r: ReachFile): Plain => ({
  grants: r.grants.map(grantPlain),
  limits: limitsPlain(r.limits),
  mayAsk: r.mayAsk.map(askRulePlain),
  never: [...r.never],
});

export const evalPlain = (e: Omit<Eval, "id">): Plain => ({
  of: e.of,
  good: e.good,
  judge:
    e.judge === "code"
      ? "code"
      : "person" in e.judge
        ? { person: e.judge.person }
        : { model: e.judge.model, agreesWith: e.judge.agreesWith },
  cases: [...e.cases],
  line: { value: e.line.value, unit: e.line.unit },
});
export const becausePlain = (b: Because): Plain => ({
  why: b.why,
  ...(b.by === undefined ? {} : { by: b.by }),
  ...(b.where === undefined ? {} : { where: b.where }),
});

export const usedSkillPlain = (s: Skill): Plain => ({ id: s.id, name: s.name, layer: s.layer, says: s.says, from: s.from });
export const ownSkillFront = (s: Skill): Plain => ({ name: s.name, layer: s.layer, says: s.says });
