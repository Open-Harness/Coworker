import type { Measure, Trigger } from "../types.ts";
import type { Ctx } from "./check-context.ts";
import { checkAccount, checkPerson } from "./check-context.ts";

function checkMeasure(c: Ctx, line: string, m: Measure): void {
  if (m.read.from === "person")
    checkPerson(c, "objective.yaml", line, m.read.person, `The measure "${m.counts}" is read from a person: it`);
  else checkAccount(c, "objective.yaml", line, m.read.account, `The measure "${m.counts}"`);
}

export function checkObjective(c: Ctx): void {
  const o = c.p.objective;
  checkPerson(c, "objective.yaml", "objective/owner", o.owner, "The owner of the objective");
  checkMeasure(c, "objective/measure", o.measure);
  for (const [i, n] of o.notWorse.entries()) checkMeasure(c, `objective/notWorse/${i + 1}`, n.measure);
}

function checkMakes(c: Ctx, line: string, t: Trigger): void {
  if (typeof t.makes !== "string" && "kind" in t.makes) {
    const kind = t.makes.kind;
    if (!c.p.kinds.some((k) => k.id === kind))
      c.say("triggers.yaml", line, `The trigger ${t.id} makes the kind ${kind}, which is not there.`);
  }
}

export function checkTriggers(c: Ctx): void {
  for (const t of c.p.triggers) {
    const line = `triggers/${t.id}`;
    checkMakes(c, line, t);
    if ((t.by === "cron" || t.by === "wait") && t.atMost === "no limit")
      c.say("triggers.yaml", line, `The trigger ${t.id} runs by itself and has no limit: say how many it may make in a day or a week.`);
    if (t.by === "cron" && !c.p.agents.some((a) => a.id === t.agent))
      c.say("triggers.yaml", line, `The trigger ${t.id} is run by the agent ${t.agent}, who is not in this playbook.`);
    if ((t.by === "event" || t.by === "wait") && !checkAccount(c, "triggers.yaml", line, t.account, `The trigger ${t.id}`)) continue;
    if (t.by === "event") {
      const known = c.account(t.account)?.events ?? [];
      for (const event of t.events)
        if (!known.includes(event))
          c.say("triggers.yaml", line, `The trigger ${t.id} waits for the event ${event}, which ${t.account} does not have.`);
    }
  }
}

export function checkAgents(c: Ctx): void {
  for (const a of c.p.agents) {
    const at = `agents/${a.id}.md`;
    const line = `agents/${a.id}`;
    for (const skill of a.skills)
      if (!c.skills.has(skill)) c.say(at, line, `The agent ${a.id} uses the skill ${skill}, which is not there.`);
    for (const tool of a.tools) if (!c.tools.has(tool)) c.say(at, line, `The agent ${a.id} has the tool ${tool}, which is not there.`);
    if (a.model === "inherit") continue;
    const { connection, model } = a.model;
    const connected = c.around.models.filter((m) => m.connection === connection);
    if (connected.length === 0)
      c.say(at, line, `The agent ${a.id} uses the model ${model} of ${connection}, and ${connection} is not connected.`);
    else if (!connected.some((m) => m.model === model))
      c.say(at, line, `The agent ${a.id} uses the model ${model}, which ${connection} does not have.`);
  }
}

export function checkSkills(c: Ctx): void {
  for (const s of c.p.skills)
    if (s.from !== "here" && !c.around.skills.includes(s.id))
      c.say("skills.yaml", `skills/${s.id}`, `The skill ${s.id} is listed as one that is there already, and it is not.`);
}
