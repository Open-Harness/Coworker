import { works } from "~/modules/work/service.ts";
import type { Kind } from "~/modules/playbook/types.ts";
import type { Moved, Work, WorkEvent } from "~/modules/work/types.ts";
import type { WorkingDeps } from "../types.ts";

/* The one way work changes: an event, applied to the work, stored with what it asks to be done, in one transaction, once by its key. */

export type Applied = Moved | { readonly _tag: "Gone" };

export function kindOf(c: WorkingDeps, work: Work): Kind | undefined {
  return c.playbook(work.version)?.kinds.find((kind) => kind.id === work.kind);
}

export function apply(c: WorkingDeps, id: string, event: WorkEvent): Applied {
  const done = c.store.transaction((): Applied => {
    const before = c.store.work(id);
    if (before === undefined) return { _tag: "Gone" };
    if (c.store.seen(event.key)) return { _tag: "Same", work: before };
    const kind = kindOf(c, before);
    if (kind === undefined) return { _tag: "Refused", why: `The playbook of version ${before.version} has no kind ${before.kind}.` };
    const moved = works.move(before, event, kind);
    if (moved._tag !== "Moved") return moved;
    c.store.see(event.key);
    c.store.putWork(moved.work);
    c.store.addJobs(id, moved.todo);
    return moved;
  });
  rearm(c);
  return done;
}

/** How soon an object that was lost in the middle of something wakes to go on with it. */
const WATCH = 2_000;

/** When something is next due: a work's own date, the time a waiting thing is tried again, or soon, while something is half done. */
export function nextAt(c: WorkingDeps): number | null {
  const dates = c.store.works().flatMap((work) => {
    if (work.ended !== null) return [];
    const hold = c.store.hold(work.id)?.retry;
    return [...(work.next === null ? [] : [work.next.by]), ...(hold === undefined ? [] : [hold])];
  });
  const half = c.store.busy().filter((id) => c.store.hold(id) === undefined);
  return half.length > 0 ? Math.min(c.clock.now() + WATCH, ...dates) : dates.length === 0 ? null : Math.min(...dates);
}

export const rearm = (c: WorkingDeps): void => c.alarm(nextAt(c));
