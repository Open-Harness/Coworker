import type { Kind, Step } from "../types.ts";
import type { Ctx } from "./check-context.ts";
import { checkAccount, checkPerson } from "./check-context.ts";
import { checkWider, knownGrants } from "./check-reach.ts";

const FILE = "workflow.yaml";

function checkEnd(c: Ctx, line: string, name: string, end: { readonly ask: string } | { readonly drop: string }): void {
  if ("ask" in end) checkPerson(c, FILE, line, end.ask, `The step ${name} asks someone: it`);
}

function checkWhoChecks(c: Ctx, line: string, s: Step): void {
  const { by, checkedBy } = s;
  if ("agent" in by && "agent" in checkedBy && by.agent === checkedBy.agent)
    c.say(FILE, line, `The step ${s.id} is done and checked by the same agent, ${by.agent}.`);
  if ("person" in by && "person" in checkedBy && by.person === checkedBy.person)
    c.say(FILE, line, `The step ${s.id} is done and checked by the same person, ${by.person}.`);
}

function checkWho(c: Ctx, line: string, s: Step): void {
  for (const who of [s.by, s.checkedBy]) {
    if ("agent" in who && !c.p.agents.some((a) => a.id === who.agent))
      c.say(FILE, line, `The step ${s.id} names the agent ${who.agent}, who is not in this playbook.`);
    if ("person" in who) checkPerson(c, FILE, line, who.person, `The step ${s.id} names a person: it`);
  }
}

function checkEnds(c: Ctx, line: string, k: Kind, s: Step): void {
  const o = s.otherwise;
  if (!("back" in o)) return checkEnd(c, line, s.id, o);
  checkEnd(c, line, s.id, o.then);
  if (!k.steps.some((other) => other.id === o.back))
    c.say(FILE, line, `The step ${s.id} goes back to ${o.back}, which is not a step of ${k.id}: it leads nowhere.`);
  if (!Number.isInteger(o.times) || o.times < 1)
    c.say(
      FILE,
      line,
      `The step ${s.id} goes back to ${o.back} ${String(o.times)} times: times must be a whole number from 1 up, or it never ends.`,
    );
}

function checkStep(c: Ctx, k: Kind, s: Step): void {
  const line = `workflow/${k.id}/${s.id}`;
  for (const skill of s.skills)
    if (!c.skills.has(skill)) c.say(FILE, line, `The step ${s.id} of ${k.id} uses the skill ${skill}, which is not there.`);
  checkWho(c, line, s);
  checkWhoChecks(c, line, s);
  checkEnds(c, line, k, s);
}

export function checkKinds(c: Ctx): void {
  for (const k of c.p.kinds) {
    const line = `workflow/${k.id}`;
    for (const g of k.may) {
      if (!checkAccount(c, FILE, line, g.account, `The kind ${k.id}`)) continue;
      const known = c.account(g.account)?.actions ?? [];
      for (const action of Object.keys(g.may))
        if (!known.includes(action)) c.say(FILE, line, `The kind ${k.id} may use ${action}, which ${g.account} has not.`);
    }
    checkWider(c, FILE, line, { grants: knownGrants(c, k.may), limits: k.limits });
    for (const s of k.steps) checkStep(c, k, s);
  }
}
