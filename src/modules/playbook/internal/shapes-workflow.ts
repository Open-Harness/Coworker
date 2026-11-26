import type { AgentRole, Check, Kind, ModelChoice, Step, Trigger } from "../types.ts";
import { arr, byTag, dispatch, exactlyOne, isRecord, lit, num, obj, opt, rec, req, str, bool, yes } from "./schema.ts";
import type { Sch } from "./schema.ts";

/* What `workflow.yaml`, `triggers.yaml` and an agent's front matter may hold. The order of fields is the order they are written in. */

export const checkSch: Sch<Check> = obj("a check", {
  id: req(str),
  says: req(str),
  by: req(lit("command", "agent", "person", "connector")),
  run: opt(str),
});

const endSch = exactlyOne("what happens", { ask: str, drop: str });
const backSch = obj("a step that goes back", { back: req(str), times: req(num), then: req(endSch) });
const otherwiseSch: Sch<Step["otherwise"]> = dispatch<Step["otherwise"]>(
  (value) => (isRecord(value) && Object.hasOwn(value, "back") ? backSch : endSch),
  "a mapping with back, ask or drop",
);

export const stepShape = {
  id: req(str),
  name: req(str),
  by: req(exactlyOne("who does it", { agent: str, person: str, manager: yes })),
  does: req(str),
  skills: req(arr(str)),
  leaves: req(arr(checkSch)),
  checkedBy: req(exactlyOne("who checks it", { agent: str, person: str, code: yes })),
  otherwise: req(otherwiseSch),
} as const;
export const stepSch: Sch<Step> = obj("a step", stepShape);

export const permissionSch = lit("on", "ask", "off");
export const grantSch = obj("a grant", { account: req(str), place: req(str), may: req(rec(permissionSch)) });
export const limitsSch = obj("limits", {
  perWork: opt(num),
  perDay: opt(num),
  perMonth: opt(num),
  hours: opt(num),
  atOnce: opt(num),
});

/** A kind as it is in a line of its own: without its steps. */
export const kindHeadShape = {
  id: req(str),
  name: req(str),
  when: req(str),
  alone: req(lit("off", "watch", "ask", "do")),
  doneWhen: req(arr(checkSch)),
  may: req(arr(grantSch)),
  limits: req(limitsSch),
  look: req(str),
} as const;
export const kindHeadSch = obj("a kind", kindHeadShape);
export const kindOf = (steps: Sch<readonly Step[]>): Sch<Kind> =>
  obj("a kind", {
    id: req(str),
    name: req(str),
    when: req(str),
    alone: req(lit("off", "watch", "ask", "do")),
    steps: req(steps),
    doneWhen: req(arr(checkSch)),
    may: req(arr(grantSch)),
    limits: req(limitsSch),
    look: req(str),
  });
export const kindSch: Sch<Kind> = kindOf(arr(stepSch));

const cadenceSch = obj("a cadence", { cron: req(str), zone: req(str) });
const makesSch: Sch<Trigger["makes"]> = dispatch<Trigger["makes"]>(
  (value) => (typeof value === "string" ? lit("tells") : exactlyOne("what it makes", { kind: str, kinds: lit("any") })),
  "tells, or a mapping with kind or kinds",
);
const atMostSch: Sch<Trigger["atMost"]> = dispatch<Trigger["atMost"]>(
  (value) => (typeof value === "string" ? lit("no limit") : obj("a limit", { a: req(lit("day", "week")), count: req(num) })),
  "no limit, or a mapping with a and count",
);
const common = {
  id: req(str),
  name: req(str),
  on: req(bool),
  makes: req(makesSch),
  only: req(str),
  atMost: req(atMostSch),
} as const;

export const triggerSch: Sch<Trigger> = byTag<Trigger>("by", {
  cron: obj("a trigger", {
    ...common,
    by: req(lit("cron")),
    when: req(cadenceSch),
    agent: req(str),
    brief: req(str),
    finds: req(arr(str)),
    same: req(arr(str)),
  }),
  event: obj("a trigger", {
    ...common,
    by: req(lit("event")),
    account: req(str),
    place: req(str),
    events: req(arr(str)),
  }),
  wait: obj("a trigger", {
    ...common,
    by: req(lit("wait")),
    for: req(str),
    of: req(str),
    holds: req(str),
    account: req(str),
  }),
  asked: obj("a trigger", { ...common, by: req(lit("asked")), where: req(str) }),
});

export const modelSch: Sch<ModelChoice> = dispatch<ModelChoice>(
  (value) =>
    typeof value === "string"
      ? lit("inherit")
      : obj("a model", { connection: req(str), model: req(str), thinking: req(lit("off", "low", "medium", "high")) }),
  "inherit, or a mapping with connection, model and thinking",
);

/** An agent without its `told`, as in a line of its own: the model has a line of its own too. */
export const agentHeadShape = { name: req(str), is: req(str), skills: req(arr(str)), tools: req(arr(str)) } as const;
export const agentFrontSch: Sch<Omit<AgentRole, "id" | "told">> = obj("an agent", { ...agentHeadShape, model: req(modelSch) });
