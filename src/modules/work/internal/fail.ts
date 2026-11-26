import type { Kind, Step } from "~/modules/playbook/types.ts";
import type { Work } from "../types.ts";
import { ask } from "./ask.ts";
import { endWork } from "./ends.ts";
import { enter } from "./enter.ts";
import { forget } from "./evidence.ts";
import { type Made, type Stamp } from "./made.ts";

/**
 * A step's leave did not hold. The step's own word says what happens: back, a number of times and then a person; a person; or drop.
 * `wrong` is what was wrong, in the words it was said in: whoever does it next is told it.
 */
export function fail(work: Work, kind: Kind, step: Step, wrong: string, e: Stamp): Made {
  const otherwise = step.otherwise;
  const question = `${work.title}: ${step.name} did not hold. ${wrong}`;
  if ("drop" in otherwise) return endWork(work, "dropped", otherwise.drop, e);
  if ("ask" in otherwise) return ask(work, kind, e, otherwise.ask, "decide", question);
  const target = kind.steps.find((s) => s.id === otherwise.back);
  const times = work.sentBack[step.id] ?? 0;
  if (target !== undefined && times < otherwise.times) {
    const counted: Work = { ...work, sentBack: { ...work.sentBack, [step.id]: times + 1 } };
    return enter(
      forget(counted, kind, target, e.at),
      kind,
      target,
      e,
      `${step.name} did not hold, so it comes back to ${target.name}: ${wrong}`,
      true,
    );
  }
  const then = otherwise.then;
  return "drop" in then ? endWork(work, "dropped", then.drop, e) : ask(work, kind, e, then.ask, "decide", question);
}
