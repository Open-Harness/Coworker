import type { Clock } from "~/modules/clock/types.ts";
import { bundleOf } from "./internal/bundle.ts";
import { checkBundle } from "./internal/check.ts";
import { type Found, ready } from "./internal/open.ts";
import { answerOf, BOXES_MIGRATIONS, forgetCalls, keepAnswer, readBox, writeBox } from "./internal/tables.ts";
import type { Boxes, BoxHost, GitPort, Ran } from "./types.ts";

export { BOXES_MIGRATIONS, checkBundle };
export type { Found, Place } from "./internal/open.ts";

export interface BoxesOver {
  readonly sql: SqlStorage;
  readonly host: BoxHost;
  /** The push is not the box's: it is done outside, by whoever holds the write token. It is given here only so that both come from one place. */
  readonly git?: GitPort;
  readonly clock: Clock;
  /** What a work's container is made from, found when it is needed. */
  readonly place: (work: string) => Promise<Found>;
}

const UNAVAILABLE = (why: string) => ({ _tag: "Unavailable" as const, why });
const wasLost = (error: unknown): boolean => error instanceof Error && /gone|410/iu.test(error.message);

/** Over the manager object's own storage, so that a call that was answered is never run again. */
export function createBoxes(over: BoxesOver): Boxes {
  const { sql, host, clock } = over;
  /** One try, and one more when the box turns out to be gone: it is started again from what was saved, or cloned. */
  async function withBox<T>(
    work: string,
    use: (box: Awaited<ReturnType<typeof ready>> & { _tag: "Ready" }) => Promise<T>,
  ): Promise<T | ReturnType<typeof UNAVAILABLE>> {
    for (const attempt of [1, 2]) {
      const opened = await ready(over, work);
      if (opened._tag === "Unavailable") return UNAVAILABLE(opened.why);
      try {
        return await use(opened);
      } catch (error) {
        if (attempt === 2 || !wasLost(error)) return UNAVAILABLE(error instanceof Error ? error.message : String(error));
        await host.destroy(work).catch(() => undefined);
      }
    }
    return UNAVAILABLE("The box could not be reached.");
  }

  return {
    run: async (work, call, command, seconds) => {
      const kept = answerOf(sql, call);
      if (kept !== undefined) return JSON.parse(kept) as Ran;
      const ran = await withBox(work, ({ box }) => box.exec(command, { seconds }));
      if ("_tag" in ran) return ran;
      keepAnswer(sql, work, call, JSON.stringify(ran));
      writeBox(sql, work, { seconds: readBox(sql, work).seconds + ran.seconds }, clock.now());
      return ran;
    },
    read: async (work, path) => {
      const text = await withBox(work, ({ box }) => box.read(path));
      return typeof text === "object" && text !== null ? undefined : text;
    },
    write: async (work, call, path, text) => {
      if (answerOf(sql, call) !== undefined) return;
      const wrote = await withBox(work, ({ box }) => box.write(path, text));
      if (wrote !== undefined) throw new Error(wrote.why);
      keepAnswer(sql, work, call, "{}");
    },
    bundle: async (work, branch) => {
      const bundled = await withBox(work, ({ box, place }) => bundleOf(box, place, branch));
      if ("_tag" in bundled) return bundled;
      writeBox(sql, work, { bundle: bundled.head }, clock.now());
      return bundled;
    },
    state: async (work) => readBox(sql, work),
    pause: async (work) => {
      if (readBox(sql, work).state !== "warm") return;
      const saved = await host.save(work).catch(() => undefined);
      if (saved === undefined) return;
      await host.destroy(work);
      writeBox(sql, work, { state: "saved", snapshot: saved.snapshot }, clock.now());
    },
    end: async (work) => {
      await host.destroy(work).catch(() => undefined);
      writeBox(sql, work, { state: "gone", snapshot: null }, clock.now());
      forgetCalls(sql, work);
    },
  };
}

/** Where there are no containers: every start says so, and nothing is ever found. */
export const noBoxes: BoxHost = {
  start: async () => ({ _tag: "Unavailable", why: "There are no containers here." }),
  find: async () => undefined,
  save: async () => undefined,
  destroy: async () => undefined,
};

/** Where nothing can be pushed from: every push is refused, in words. */
export const noPush: GitPort = { push: async () => ({ _tag: "Refused", why: "Nothing can be pushed from here." }) };
