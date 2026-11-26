import type { Job, WorkingDeps } from "../types.ts";
import { answered } from "./answered.ts";
import { askIdOf, DAY, type Spec, nextAskId, openAsk, waitsFor } from "./asking.ts";
import { done, held, type Outcome } from "./start.ts";

/* What the work asks of a person that the work itself decides to ask: it reached a limit, it was sent back too often, nobody could say. */

type AskJob = Extract<Job, { readonly do: "ask" }>;

const money = (dollars: number): string => `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;

/** The ask of a job of the work: a limit that was reached offers to go on or stop; anything else is a question for the person. */
export async function askJob(c: WorkingDeps, workId: string, job: AskJob): Promise<Outcome> {
  const work = c.store.work(workId);
  if (work === undefined || work.ended !== null) return done;
  const limit = job.key.startsWith("spent:");
  const more = work.mandate.limits.perWork ?? 0;
  const live = c.store.threadsOf(workId).findLast((one) => one.state === "working");
  const spec: Spec = {
    id: askIdOf(job.key),
    person: job.person,
    need: job.need === "approve" ? "decide" : job.need,
    question: job.question,
    why: limit
      ? `${c.manager.name} stopped at the limit of this work, and keeps what it made.`
      : `${c.manager.name} needs an answer about "${work.title}".`,
    options: limit
      ? [
          {
            id: "go-on",
            label: `Go on, with ${money(more)} more`,
            then: `${c.manager.name} goes on with this work, and may spend ${money(more)} more on it.`,
          },
          { id: "stop", label: "Stop it", then: `${c.manager.name} stops this work and keeps what it made.` },
        ]
      : [],
    best: null,
    shows: null,
    by: job.by,
    parked: limit ? { kind: "limit", thread: live?.id ?? null } : { kind: "plain" },
  };
  const opened = await openAsk(c, work, spec);
  return opened._tag === "Held" ? held(opened.why) : done;
}

/** A model that did not answer: the work waits for it, and a person is asked, once, whether to try it again or to stop. */
export async function askAboutModel(c: WorkingDeps, workId: string, job: Job, model: string, says: string): Promise<Outcome> {
  const work = c.store.work(workId);
  if (work === undefined || work.ended !== null) return held(says);
  const id = nextAskId(c, `model:${workId}:${job.key}`);
  const spec: Spec = {
    id,
    person: work.answers,
    need: "decide",
    question: `${says} "${work.title}" waits for it. Try the model again, or stop?`,
    why: `${c.manager.name} calls ${model}, and it does not answer.`,
    options: [
      { id: "again", label: "Try again", then: `${c.manager.name} calls ${model} again now, and goes on.` },
      { id: "stop", label: "Stop it", then: `${c.manager.name} stops this work and keeps what it made.` },
    ],
    best: "again",
    shows: null,
    by: c.clock.now() + DAY,
    parked: { kind: "model" },
  };
  const opened = await openAsk(c, work, spec);
  if (opened._tag === "Asked") {
    c.store.keepOnce(`modelask:${job.key}`, id);
    waitsFor(c, work, spec);
  }
  return held(opened._tag === "Held" ? opened.why : says);
}

/** The model works again with no one answering: the ask is not asked any more, and the work is no longer waiting for anyone. */
export async function modelIsBack(c: WorkingDeps, workId: string, job: Job): Promise<void> {
  const id = c.store.once(`modelask:${job.key}`);
  if (id === undefined || c.store.once(`answered:${id}`) !== undefined) return;
  await c.outside.asks({ op: "gone", work: workId, why: "The model works again.", ask: id });
  answered(c, { ask: id, work: workId, person: "The model", answer: "It works again", option: null, where: "model", at: c.clock.now() });
}
