import type { Kind } from "~/modules/playbook/types.ts";
import type { ToDo, Work } from "../types.ts";
import { type Made, type Stamp, keyOf } from "./made.ts";
import { lookMs } from "./time.ts";

/** It waits for a person, by a date after now. The ask is made under this event's key, and that is its id. */
export function ask(work: Work, kind: Kind, e: Stamp, person: string, need: Extract<ToDo, { do: "ask" }>["need"], question: string): Made {
  const key = keyOf(e, "ask");
  const by = e.at + lookMs(kind.look);
  return {
    work: { ...work, waits: { ask: key, person }, chased: false, next: { what: `an answer from ${person}`, who: { person }, by } },
    todo: [{ key, do: "ask", person, need, question, by }],
  };
}
