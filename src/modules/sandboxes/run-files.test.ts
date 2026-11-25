import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { Env } from "~/main.ts";
import { fakeClock } from "~/modules/clock/testing.ts";
import { openSandboxes } from "./service.ts";
import type { SandboxHost } from "./types.ts";

const { WORKSPACE } = env as unknown as Env;
const request = { agent: "Worker", command: "git clone", managerId: "mgr_1", run: "run-1" };

/** A host where each command leaves a new image, and the images in `gone` have expired. */
function keeping() {
  const started: string[] = [];
  const gone = new Set<string>();
  let running = 0;
  let most = 0;
  const host: SandboxHost = {
    prepare: async ({ key }) => ({ _tag: "Prepared", image: `setup:${key}`, seconds: 5 }),
    exec: async ({ image }) => {
      if (gone.has(image)) return { _tag: "Unavailable", reason: "gone", expired: true };
      started.push(image);
      most = Math.max(most, ++running);
      await Promise.resolve();
      running -= 1;
      return { _tag: "Ran", output: { exitCode: 0, stdout: "", stderr: "", seconds: 2 }, kept: `left-${started.length}` };
    },
  };
  return { host, started, gone, most: () => most };
}

const inObject = (host: SandboxHost, fn: (sandboxes: ReturnType<typeof openSandboxes>, environment: string) => Promise<void>) =>
  runInDurableObject(WORKSPACE.get(WORKSPACE.newUniqueId()), async (_instance, state) => {
    let n = 0;
    const sandboxes = openSandboxes({
      agents: () => [],
      sql: state.storage.sql,
      host,
      secrets: { use: async (name, use) => ({ _tag: "Used", value: await use(name) }) },
      clock: fakeClock(),
      ids: { next: (prefix: string) => `${prefix}_${++n}` },
      building: new Map(),
      turns: new Map(),
    });
    const saved = sandboxes.save({ name: "app", setup: "pnpm install", size: "1 vCPU · 2 GB" });
    if (saved._tag !== "Saved") throw new Error(saved._tag);
    sandboxes.assign("Worker", saved.environment.id);
    await fn(sandboxes, saved.environment.id);
  });

describe("a run's files", () => {
  it("are there for its next command, even after the setup changes, and for no other run", () => {
    const { host, started } = keeping();
    return inObject(host, async (sandboxes, id) => {
      await sandboxes.exec(request);
      await sandboxes.exec(request);
      sandboxes.save({ id, name: "app", setup: "pnpm i", size: "1 vCPU · 2 GB" });
      await sandboxes.exec(request);
      await sandboxes.exec({ ...request, run: "run-2" });
      await sandboxes.exec({ ...request, managerId: "mgr_2" });
      expect(started).toEqual([`setup:${id}:1`, "left-1", "left-2", `setup:${id}:2`, `setup:${id}:2`]);
    });
  });

  it("are kept in order when its commands are asked for at once", () => {
    const { host, started, most } = keeping();
    return inObject(host, async (sandboxes, id) => {
      await Promise.all([sandboxes.exec(request), sandboxes.exec(request), sandboxes.exec(request)]);
      expect(started).toEqual([`setup:${id}:1`, "left-1", "left-2"]);
      expect(most()).toBe(1);
    });
  });

  it("start from the setup again when they have expired, and the command is told", () => {
    const { host, started, gone } = keeping();
    return inObject(host, async (sandboxes, id) => {
      await sandboxes.exec(request);
      gone.add("left-1");
      expect(JSON.stringify(await sandboxes.exec(request))).toContain("earlier files have expired");
      expect(JSON.stringify(await sandboxes.exec(request))).not.toContain("earlier files have expired");
      expect(started).toEqual([`setup:${id}:1`, `setup:${id}:1`, "left-2"]);
    });
  });

  it("are another environment's when the run moves to it", () => {
    const { host, started } = keeping();
    return inObject(host, async (sandboxes, id) => {
      const other = sandboxes.save({ name: "docs", setup: "make", size: "1 vCPU · 2 GB" });
      if (other._tag !== "Saved") throw new Error(other._tag);
      await sandboxes.exec(request);
      await sandboxes.exec({ ...request, environment: other.environment.id });
      expect(started).toEqual([`setup:${id}:1`, `setup:${other.environment.id}:1`]);
    });
  });
});
