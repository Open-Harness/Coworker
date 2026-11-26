import type { NewWork, ToDo, Work } from "../types.ts";
import { enter } from "./enter.ts";
import { seal } from "./move.ts";
import { lookMs } from "./time.ts";

/** Put on the kind's first step and started; or, with no room, at triage with a date to look again. */
export function take(input: NewWork): { readonly work: Work; readonly todo: readonly ToDo[] } {
  const { kind } = input;
  const base: Work = {
    id: input.id,
    manager: input.manager,
    kind: kind.id,
    version: input.version,
    title: input.title,
    about: input.about,
    from: input.from,
    asked: input.asked,
    answers: input.answers,
    mandate: input.mandate,
    doneWhen: null,
    evidence: [],
    step: "triage",
    sentBack: {},
    threads: [],
    follows: [input.from],
    next: null,
    waits: null,
    chased: false,
    cost: 0,
    ended: null,
    order: 0,
    priority: "soon",
  };
  const stamp = { key: `take:${input.id}`, at: input.at };
  const first = kind.steps[0];
  const placed =
    input.waits || first === undefined
      ? { work: { ...base, next: { what: "a place to start", who: "itself" as const, by: input.at + lookMs(kind.look) } }, todo: [] }
      : enter(base, kind, first, stamp, "", true);
  return seal(base, placed.work, placed.todo, stamp, kind);
}
