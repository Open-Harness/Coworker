import type { AskRule, Because, Eval, Measure, ReachFile, Skill } from "../types.ts";
import { arr, dispatch, isRecord, lit, num, obj, opt, req, str, byTag } from "./schema.ts";
import type { Sch } from "./schema.ts";
import { grantSch, limitsSch } from "./shapes-workflow.ts";

/* What the other files may hold: the objective, the reach, an eval, a skill, a reason. */

const beforeSch: Sch<Measure["before"]> = dispatch<Measure["before"]>(
  (value) =>
    isRecord(value) && Object.hasOwn(value, "unknown")
      ? obj("what it was before", { unknown: req(str) })
      : obj("what it was before", { value: req(num), at: req(str) }),
  "a mapping with value and at, or with unknown",
);
export const measureSch: Sch<Measure> = obj("a measure", {
  counts: req(str),
  unit: req(str),
  better: req(lit("more", "less")),
  read: req(
    byTag<Measure["read"]>("from", {
      connector: obj("a measure read from a connector", { from: req(lit("connector")), account: req(str), query: req(str) }),
      person: obj("a measure read from a person", { from: req(lit("person")), person: req(str), asks: req(str) }),
    }),
  ),
  settles: req(str),
  before: req(beforeSch),
});
export const aimSch = obj("an aim", { value: req(num), by: req(str) });
export const notWorseSch = obj("a measure that may not get worse", { measure: req(measureSch), limit: req(num) });

const askWho: Sch<AskRule["listed"]> = dispatch<AskRule["listed"]>(
  (value) =>
    isRecord(value) && Array.isArray(value["who"])
      ? obj("who may ask", { who: req(arr(str)) })
      : obj("who may ask", { who: req(lit("team", "writers")) }),
  "a mapping with who",
);
export const askRuleSch: Sch<AskRule> = obj("a rule of who may ask", {
  account: req(str),
  place: req(str),
  listed: req(askWho),
  others: req(lit("asked", "maybe", "no")),
  overheard: req(lit("maybe", "no")),
  bots: req(arr(str)),
});

export const reachSch: Sch<ReachFile> = obj("the reach", {
  grants: req(arr(grantSch)),
  limits: req(limitsSch),
  mayAsk: req(arr(askRuleSch)),
  never: req(arr(str)),
});

const judgeSch: Sch<Eval["judge"]> = dispatch<Eval["judge"]>(
  (value) =>
    typeof value === "string"
      ? lit("code")
      : isRecord(value) && Object.hasOwn(value, "person")
        ? obj("a judge", { person: req(str) })
        : obj("a judge", { model: req(str), agreesWith: req(str) }),
  "code, or a mapping with person, or with model and agreesWith",
);
export const evalShape = {
  of: req(str),
  good: req(str),
  judge: req(judgeSch),
  cases: req(arr(str)),
  line: req(obj("a line to reach", { value: req(num), unit: req(str) })),
} as const;
export const evalSch: Sch<Omit<Eval, "id">> = obj("an eval", evalShape);

export const becauseSch: Sch<Because> = obj("a reason", {
  why: req(lit("you said", "looked up", "my idea")),
  by: opt(str),
  where: opt(str),
});

export const ownSkillSch = obj("a skill", { name: req(str), layer: req(lit("craft", "playbook")), says: req(str) });
export const usedSkillSch: Sch<Skill> = obj("a skill", {
  id: req(str),
  name: req(str),
  layer: req(lit("harness", "connector", "craft", "playbook")),
  says: req(str),
  from: req(lit("library", "connector", "harness")),
});
