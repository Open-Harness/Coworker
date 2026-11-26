import type { Clock } from "~/modules/clock/types.ts";
import { bundleOf } from "./internal/bundle.ts";
import { checkBundle } from "./internal/check.ts";
import { attempt } from "./internal/attempt.ts";
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

export interface Unavailable {
  readonly _tag: "Unavailable";
  readonly why: string;
}
const UNAVAILABLE = (why: string): Unavailable => ({ _tag: "Unavailable", why });

/** The contract's `Boxes`, and the write that says in a value when it could not be done: `Boxes.write` has no place for one. */
export type BoxesWithPut = Boxes & {
  readonly put: (work: string, call: string, path: string, text: string) => Promise<Unavailable | undefined>;
};

/** Over the manager object's own storage, so that a call that was answered is never run again. */
export function createBoxes(over: BoxesOver): BoxesWithPut {
  const { sql, host, clock } = over;
  /**
   * One try, and one more when the box turns out to be gone: it is started again from what was saved, or cloned. Gone is
   * what the host says when asked after a call failed (it finds no box), never what the failure's words were.
   */
  async function withBox<T>(
    work: string,
    use: (box: Awaited<ReturnType<typeof ready>> & { _tag: "Ready" }) => Promise<T>,
  ): Promise<{ readonly _tag: "Used"; readonly value: T } | Unavailable> {
    for (const attempts of [1, 2]) {
      const opened = await ready(over, work);
      if (opened._tag === "Unavailable") return UNAVAILABLE(opened.why);
      const tried = await attempt(() => use(opened));
      if (tried._tag === "Done") return { _tag: "Used", value: tried.value };
      const stillThere = await host.find(work).then(
        (found) => found !== undefined,
        () => true,
      );
      if (stillThere || attempts === 2) return UNAVAILABLE(tried.why);
      await host.destroy(work).catch(() => undefined);
    }
    return UNAVAILABLE("The box could not be reached.");
  }

  async function put(work: string, call: string, path: string, text: string): Promise<Unavailable | undefined> {
    if (answerOf(sql, call) !== undefined) return undefined;
    const used = await withBox(work, ({ box }) => box.write(path, text));
    if (used._tag === "Unavailable") return used;
    keepAnswer(sql, work, call, "{}");
    return undefined;
  }

  return {
    run: async (work, call, command, seconds) => {
      const kept = answerOf(sql, call);
      if (kept !== undefined) return JSON.parse(kept) as Ran;
      const used = await withBox(work, ({ box }) => box.exec(command, { seconds }));
      if (used._tag === "Unavailable") return used;
      const ran = used.value;
      keepAnswer(sql, work, call, JSON.stringify(ran));
      writeBox(sql, work, { seconds: readBox(sql, work).seconds + ran.seconds }, clock.now());
      return ran;
    },
    read: async (work, path) => {
      const used = await withBox(work, ({ box }) => box.read(path));
      return used._tag === "Used" ? used.value : undefined;
    },
    put,
    write: async (work, call, path, text) => {
      const refused = await put(work, call, path, text);
      // The contract's `write` answers nothing, so it has no way to say so but this: the product calls `put`.
      if (refused !== undefined) throw new Error(refused.why);
    },
    bundle: async (work, branch) => {
      const used = await withBox(work, ({ box, place }) => bundleOf(box, place, branch));
      if (used._tag === "Unavailable") return used;
      if ("_tag" in used.value) return used.value;
      writeBox(sql, work, { bundle: used.value.head }, clock.now());
      return used.value;
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
