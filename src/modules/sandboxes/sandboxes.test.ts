import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { Env } from "~/main.ts";
import { fakeClock } from "~/modules/clock/testing.ts";
import { openSandboxes } from "./service.ts";
import { fakeSandboxes } from "./testing.ts";
import type { Prepared, SandboxesDependencies } from "./types.ts";

const { WORKSPACE } = env as unknown as Env;

/** A fresh Workspace object's storage, a scripted host and a vault holding `vault`. */
const inObject = <T>(
  vault: Readonly<Record<string, string>>,
  fn: (sandboxes: ReturnType<typeof openSandboxes>, host: ReturnType<typeof fakeSandboxes>) => Promise<T>,
) =>
  runInDurableObject(WORKSPACE.get(WORKSPACE.newUniqueId()), (_instance, state) => {
    const host = fakeSandboxes();
    let n = 0;
    const secrets: SandboxesDependencies["secrets"] = {
      use: async (name, use) => {
        const value = vault[name];
        return value === undefined ? { _tag: "NoSuchSecret", name } : { _tag: "Used", value: await use(value) };
      },
    };
    const building = new Map<string, Promise<Prepared>>();
    const ids = { next: (prefix: string) => `${prefix}_${++n}` };
    return fn(
      openSandboxes({ agents: () => [], sql: state.storage.sql, host, secrets, clock: fakeClock(), ids, building, turns: new Map() }),
      host,
    );
  });

const request = { agent: "Worker", command: "pnpm test", managerId: "mgr_1", run: "run-1" };

describe("sandboxes", () => {
  it("sets up again only when the setup changes, and once for runs that start together", () =>
    inObject({}, async (sandboxes, host) => {
      const saved = sandboxes.save({ name: "app", setup: "pnpm install", size: "2 vCPU · 4 GB" });
      if (saved._tag !== "Saved") throw new Error(saved._tag);
      const { id } = saved.environment;
      expect(sandboxes.assign("Worker", id)).toEqual({ _tag: "Assigned" });
      await Promise.all([sandboxes.exec(request), sandboxes.exec({ ...request, run: "run-2" })]);
      expect(host.prepared.map(({ key }) => key)).toEqual([`${id}:1`]);
      expect(sandboxes.save({ id, name: "app 2", setup: "pnpm install", size: "2 vCPU · 4 GB" })).toMatchObject({
        environment: { version: 1 },
      });
      expect(sandboxes.save({ id, name: "app", setup: "pnpm i", size: "2 vCPU · 4 GB" })).toMatchObject({ environment: { version: 2 } });
      await sandboxes.exec(request);
      expect(host.prepared.map(({ key }) => key)).toEqual([`${id}:1`, `${id}:2`]);
    }));

  it("says why a command cannot run", () =>
    inObject({}, async (sandboxes, host) => {
      expect(await sandboxes.exec({ ...request, environment: "env_404" })).toEqual({ _tag: "NoEnvironment", agent: "Worker" });
      expect(sandboxes.assign("Worker", "env_404")).toEqual({ _tag: "NoSuchEnvironment" });
      const saved = sandboxes.save({ name: "app", setup: "export TOKEN=vault:missing", size: "1 vCPU · 2 GB" });
      if (saved._tag !== "Saved") throw new Error(saved._tag);
      sandboxes.assign("Worker", saved.environment.id);
      expect(await sandboxes.exec(request)).toEqual({ _tag: "MissingSecret", name: "missing" });
      sandboxes.save({ id: saved.environment.id, name: "app", setup: "make", size: "1 vCPU · 2 GB" });
      host.setup.failWith = "make: no rule";
      expect(await sandboxes.exec(request)).toEqual({ _tag: "SetupFailed", output: "make: no rule" });
      expect(sandboxes.environments()[0]).toMatchObject({ status: "Failed", output: "make: no rule", usedBy: ["Worker"] });
      expect(sandboxes.save({ name: " ", setup: "", size: "1 vCPU · 2 GB" })).toMatchObject({ _tag: "Invalid" });
    }));
});
