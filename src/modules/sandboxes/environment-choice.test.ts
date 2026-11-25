import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { Env } from "~/main.ts";
import { fakeClock } from "~/modules/clock/testing.ts";
import { openSandboxes } from "./service.ts";
import { fakeSandboxes } from "./testing.ts";
import type { Prepared } from "./types.ts";

const { WORKSPACE } = env as unknown as Env;

const inObject = <T>(fn: (sandboxes: ReturnType<typeof openSandboxes>) => Promise<T>, host = fakeSandboxes()) =>
  runInDurableObject(WORKSPACE.get(WORKSPACE.newUniqueId()), (_instance, state) => {
    let n = 0;
    const secrets = { use: async <U>(name: string, _use: (value: string) => Promise<U>) => ({ _tag: "NoSuchSecret" as const, name }) };
    const sandboxes = openSandboxes({
      agents: () => [],
      sql: state.storage.sql,
      host,
      secrets,
      clock: fakeClock(),
      ids: { next: (prefix: string) => `${prefix}_${++n}` },
      building: new Map<string, Promise<Prepared>>(),
      turns: new Map(),
    });
    return fn(sandboxes);
  });

const request = { agent: "Docs writer", command: "pnpm test", managerId: "mgr_1", run: "run-1" };

describe("the environment a command names", () => {
  it("runs in the environment named by id, even when no agent of that name is assigned to it any more", () =>
    inObject(async (sandboxes) => {
      const saved = sandboxes.save({ name: "app", setup: "pnpm install", size: "2 vCPU · 4 GB" });
      if (saved._tag !== "Saved") throw new Error(saved._tag);
      const { id } = saved.environment;
      expect(await sandboxes.exec(request)).toMatchObject({ _tag: "Ran", environment: "the plain container" });
      expect(await sandboxes.exec({ ...request, environment: id })).toMatchObject({ _tag: "Ran", environment: "app" });
    }));

  it("runs in the plain container when the run took none, even if its agent has been given one since", () =>
    inObject(async (sandboxes) => {
      const saved = sandboxes.save({ name: "app", setup: "pnpm install", size: "2 vCPU · 4 GB" });
      if (saved._tag !== "Saved") throw new Error(saved._tag);
      sandboxes.assign("Docs writer", saved.environment.id);
      expect(await sandboxes.exec({ ...request, environment: null })).toMatchObject({ _tag: "Ran", environment: "the plain container" });
      expect(await sandboxes.exec({ ...request, environment: "env_gone" })).toEqual({ _tag: "NoEnvironment", agent: "Docs writer" });
    }));

  it("tries the plain container again after it could not be made: it has no setup anyone could correct", () => {
    const host = fakeSandboxes();
    host.setup.failWith = "no room";
    return inObject(async (sandboxes) => {
      expect(await sandboxes.exec(request)).toMatchObject({ _tag: "SetupFailed", output: "no room" });
      host.setup.failWith = undefined;
      expect(await sandboxes.exec(request)).toMatchObject({ _tag: "Ran", environment: "the plain container" });
    }, host);
  });
});
