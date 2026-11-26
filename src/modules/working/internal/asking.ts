import { asks } from "~/modules/asks/service.ts";
import type { ToDo } from "~/modules/work/types.ts";
import type { WorkingDeps } from "../types.ts";
import { done, type Outcome } from "./start.ts";

/** A person is asked, once by the job's key: the ask is kept in this manager's object, and the inbox reads it from here. */
export function asking(c: WorkingDeps, workId: string, job: Extract<ToDo, { readonly do: "ask" }>): Outcome {
  const work = c.store.work(workId);
  if (work === undefined || c.store.asks().some(({ id }) => id === job.key)) return done;
  const made = asks.ask(
    {
      id: job.key,
      to: job.person,
      need: job.need,
      about: { work: workId, manager: c.manager.id, title: work.title },
      question: job.question,
      why: "",
      options: [],
      best: null,
      shows: null,
      by: job.by,
      then: [],
      else: "wait",
    },
    c.clock.now(),
  );
  if (made._tag === "Asked") c.store.putAsk(made.ask);
  return done;
}
