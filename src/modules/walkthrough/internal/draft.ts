import type { WalkEvent, Walked, Walkthrough } from "../types.ts";
import { readBecause, writeBecause } from "./because.ts";
import { refuse, walked } from "./result.ts";

type Is<T extends WalkEvent["is"]> = Extract<WalkEvent, { is: T }>;

const JUDGED_ENOUGH = 10;

function endRead(walk: Walkthrough): Walkthrough["wants"] {
  return walk.wants.map((want) => (want.state === "connected" ? { ...want, state: "ended" } : want));
}

/** After the questions: from a template, or when nothing needed reading, the second round and the finding are left out. */
const DRAFTABLE = new Set(["first questions", "found", "second questions"]);

export function drafted(walk: Walkthrough, event: Is<"drafted">): Walked {
  if (!DRAFTABLE.has(walk.stage)) return refuse("The draft comes after the questions, and after what it found when it was connected.");
  const ids = event.cases.map((one) => one.id);
  if (new Set(ids).size !== ids.length) return refuse("Two of the cases have the same id.");
  const cases = event.cases.map((one) => ({ ...one, said: null }));
  return walked({ ...walk, stage: "draft", draft: event.draft, cases });
}

/** A person's edit: the draft as they left it, and the lines they changed are theirs. */
export function edited(walk: Walkthrough, event: Is<"edited">): Walked {
  if (walk.stage !== "draft") return refuse("Only a draft can be edited.");
  const because = readBecause(walk.draft);
  for (const line of event.lines) because.set(line, { why: "you said", by: event.by });
  return walked({ ...walk, draft: writeBecause(event.draft, because) });
}

export function judged(walk: Walkthrough, event: Is<"judged">): Walked {
  if (walk.stage !== "draft") return refuse("Cases are judged once there is a draft.");
  if (!walk.cases.some((one) => one.id === event.case)) return refuse(`There is no case ${event.case}.`);
  return walked({ ...walk, cases: walk.cases.map((one) => (one.id === event.case ? { ...one, said: event.said } : one)) });
}

/** Only with ten cases judged; the manager is made from what was drafted, and reading ends. */
export function make(walk: Walkthrough): Walked {
  if (walk.stage !== "draft") return refuse("There is no draft to make yet.");
  const done = walk.cases.filter((one) => one.said !== null).length;
  if (done < JUDGED_ENOUGH) return refuse(`Ten cases must be judged first, and ${done} are.`);
  return walked({ ...walk, stage: "made", made: `manager-${walk.id}`, wants: endRead(walk) }, ["make manager", "end read access"]);
}

export function throwAway(walk: Walkthrough): Walked {
  return walked({ ...walk, stage: "thrown away", wants: endRead(walk) }, ["end read access"]);
}
