import { works } from "~/modules/work/service.ts";
import type { AdoptInput, WorkingDeps } from "../types.ts";
import { apply, rearm } from "./events.ts";

/** Work another manager handed over: begun here as work of its kind, then put on the step it was at, with what it knew and followed. */
export async function adopt(
  c: WorkingDeps,
  { from, version, at }: AdoptInput,
): Promise<{ readonly work: string } | { readonly _tag: "NoSuchKind"; readonly why: string }> {
  const id = `work_over_${from.id}`;
  if (c.store.work(id) !== undefined) return { work: id };
  const kinds = c.playbook(version)?.kinds ?? [];
  const kind = kinds.find((one) => one.id === from.kind) ?? kinds[0];
  if (kind === undefined) return { _tag: "NoSuchKind", why: `There is no kind of work in version ${version}.` };
  const made = works.take({
    id,
    manager: c.manager.id,
    kind,
    version,
    title: from.title,
    about: from.about,
    from: from.from,
    asked: from.asked,
    answers: from.answers,
    mandate: from.mandate.state === "stopped" ? { ...from.mandate, state: "holds" } : from.mandate,
    at,
    waits: false,
  });
  const here = made.work.step;
  // What was at hand on the first step is not done again: the work goes straight to the step it was at, and that step says what is next.
  const moves = from.step !== here && kind.steps.some((step) => step.id === from.step);
  c.store.transaction(() => {
    c.store.see(`take:${id}`);
    c.store.putWork({
      ...made.work,
      doneWhen: from.doneWhen,
      evidence: from.evidence,
      follows: from.follows,
      sentBack: from.sentBack,
      priority: from.priority,
      order: from.order,
    });
    if (!moves) c.store.addJobs(id, made.todo);
  });
  if (moves) apply(c, id, { key: `adopt:${id}`, at, is: "moved", person: "handed over", step: from.step });
  rearm(c);
  return { work: id };
}
