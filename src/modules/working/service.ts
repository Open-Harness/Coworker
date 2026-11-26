import { apply, rearm } from "./internal/events.ts";
import { drain } from "./internal/jobs.ts";
import { heard, openOf, take } from "./internal/take.ts";
import { clonePlace } from "./internal/place.ts";
import type { Working, WorkingDeps } from "./types.ts";

export { clonePlace };

/** A manager's way with its work, over what it keeps and what is outside it. */
export function createWorking(c: WorkingDeps): Working {
  const running = new Map<string, Promise<void>>();

  /** Every piece of work with something to do goes on, each once at a time. Answers when none can go further. */
  async function run(): Promise<void> {
    for (const id of c.store.busy()) {
      if (running.has(id)) continue;
      const going = drain(c, id).finally(() => void running.delete(id));
      running.set(id, going);
    }
    await Promise.all(running.values());
    rearm(c);
  }

  return {
    take: async (input) => {
      const taken = await take(c, input);
      if ("_tag" in taken) return taken;
      c.later(run());
      return taken;
    },
    heard: async ({ work, item }) => {
      await heard(c, work, item);
      c.later(run());
    },
    open: () => openOf(c.store.works()),
    run,
    due: async () => {
      const now = c.clock.now();
      for (const work of c.store.works()) {
        if (work.ended !== null) continue;
        if ((c.store.hold(work.id)?.retry ?? Infinity) <= now) c.store.setHold(work.id, null);
        if (work.next !== null && work.next.by <= now) apply(c, work.id, { key: `due:${work.id}:${work.next.by}`, at: now, is: "due" });
      }
      await run();
    },
  };
}
