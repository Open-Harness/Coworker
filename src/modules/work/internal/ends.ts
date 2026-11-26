import type { Ended, Work } from "../types.ts";
import { type Made, type Stamp } from "./made.ts";
import { endTodos, sayTodo } from "./todo.ts";

const VERB: Readonly<Record<Ended["as"], string>> = {
  done: "is done",
  no: "will not be done",
  dropped: "was dropped",
  stopped: "was stopped",
  "handed over": "was handed over",
};

export function endThreads(work: Work): Work {
  return { ...work, threads: work.threads.map((t) => ({ ...t, state: "ended" as const })) };
}

/** It ends: nothing runs, nothing waits, nothing is next, and whoever asked is told where they asked. */
export function endWork(work: Work, as: Ended["as"], why: string, e: Stamp): Made {
  const reason = why.trim() === "" ? `The work ${VERB[as]}.` : why;
  const mandate = as === "stopped" ? { ...work.mandate, state: "stopped" as const } : work.mandate;
  const ended = { ...endThreads(work), mandate, ended: { as, why: reason, at: e.at }, next: null, waits: null, chased: false };
  return { work: ended, todo: [...endTodos(e), sayTodo(e, work.from, `${work.title} ${VERB[as]}. ${reason}`)] };
}
