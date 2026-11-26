import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { Env } from "~/main.ts";
import { createBoxes, type Place } from "./service.ts";
import type { BoxHandle, BoxHost, BoxSpec } from "./types.ts";

const spec: BoxSpec = { work: "w", size: "1 vCPU · 2 GB", setUp: "", clone: null, env: {}, hosts: [] };
const place: Place = { spec, repo: "acme/web", base: "main" };
const clock = { now: () => 1 };
const ran = { exitCode: 0, stdout: "ok", stderr: "", seconds: 1 };

/** A host whose first box is lost after it was started: its calls reject in words of their own, and `find` no longer finds it. */
function losing(words: string): { readonly host: BoxHost; readonly started: () => number } {
  let [starts, lost] = [0, false];
  const box = (dies: boolean): BoxHandle => ({
    exec: async () => {
      if (dies) {
        lost = true;
        throw new Error(words);
      }
      return ran;
    },
    read: async () => undefined,
    write: async () => undefined,
  });
  return {
    started: () => starts,
    host: {
      start: async () => ({ _tag: "Open", from: "new", box: box(++starts === 1) }),
      find: async () => (lost || starts === 0 ? undefined : box(false)),
      save: async () => undefined,
      destroy: async () => undefined,
    },
  };
}

const inside = <T>(use: (sql: SqlStorage) => Promise<T>): Promise<T> =>
  runInDurableObject((env as unknown as Env).MANAGER_STORE.getByName(`boxes-${crypto.randomUUID()}`), (_instance, state) =>
    use(state.storage.sql),
  );

describe("boxes", () => {
  it.each(["The box is gone: 410", "container evaporated", "ECONNRESET"])(
    "starts a box again when the host no longer has it, whatever the failure said (%s)",
    (words) =>
      inside(async (sql) => {
        const { host, started } = losing(words);
        const boxes = createBoxes({ sql, host, clock, place: async () => ({ _tag: "Place", place }) });
        expect(await boxes.run("w", "call-1", "true", 5)).toEqual(ran);
        expect(started()).toBe(2);
      }),
  );

  it("says in words, and does not start again, when a call fails but the box is still there", () =>
    inside(async (sql) => {
      let starts = 0;
      const box: BoxHandle = {
        exec: async () => {
          throw new Error("the command timed out");
        },
        read: async () => undefined,
        write: async () => undefined,
      };
      const host: BoxHost = {
        start: async () => ({ _tag: "Open", from: "new", box: ((starts += 1), box) }),
        find: async () => (starts === 0 ? undefined : box),
        save: async () => undefined,
        destroy: async () => undefined,
      };
      const boxes = createBoxes({ sql, host, clock, place: async () => ({ _tag: "Place", place }) });
      expect(await boxes.run("w", "call-2", "sleep 99", 1)).toEqual({ _tag: "Unavailable", why: "the command timed out" });
      expect(starts).toBe(1);
    }));

  it("says in a value when a file could not be written, and keeps nothing of it", () =>
    inside(async (sql) => {
      const host: BoxHost = {
        start: async () => ({ _tag: "Unavailable", why: "There are no containers free." }),
        find: async () => undefined,
        save: async () => undefined,
        destroy: async () => undefined,
      };
      const boxes = createBoxes({ sql, host, clock, place: async () => ({ _tag: "Place", place }) });
      expect(await boxes.put("w", "call-3", "a.txt", "hi")).toEqual({ _tag: "Unavailable", why: "There are no containers free." });
    }));
});
