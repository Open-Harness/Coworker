import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { Env } from "~/main.ts";
import { fakeClock } from "~/modules/clock/testing.ts";
import { openSandboxes } from "./service.ts";
import type { Prepared, SandboxHost } from "./types.ts";

const { WORKSPACE } = env as unknown as Env;
const request = { agent: "Worker", command: "pnpm test", managerId: "mgr_1", run: "run-1" };

/** A host whose first kept setup expires after it is made: the platform says so the next time something starts from it. */
function expiring(): { host: SandboxHost; made: string[]; started: string[] } {
  const made: string[] = [];
  const started: string[] = [];
  const host: SandboxHost = {
    prepare: async () => {
      made.push(`snap-${made.length + 1}`);
      return { _tag: "Prepared", image: `standard-2/snap-${made.length}`, seconds: 5 };
    },
    exec: async ({ image, env: given }) => {
      started.push(image);
      if (image === "standard-2/snap-1") return { _tag: "Unavailable", reason: "The kept setup is gone", expired: true };
      return { _tag: "Ran", output: { exitCode: 0, stdout: `token=${given["GH_TOKEN"] ?? "none"}`, stderr: "", seconds: 2 } };
    },
  };
  return { host, made, started };
}

const inObject = <T>(host: SandboxHost, fn: (sandboxes: ReturnType<typeof openSandboxes>) => Promise<T>) =>
  runInDurableObject(WORKSPACE.get(WORKSPACE.newUniqueId()), (_instance, state) => {
    let n = 0;
    const secrets = {
      use: async <U>(name: string, use: (value: string) => Promise<U>) => ({ _tag: "Used" as const, value: await use(name) }),
    };
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

describe("an expired setup", () => {
  it("runs its setup once more, and then the command, instead of failing", () => {
    const { host, made, started } = expiring();
    return inObject(host, async (sandboxes) => {
      const saved = sandboxes.save({ name: "app", setup: "pnpm install", size: "1 vCPU · 2 GB" });
      if (saved._tag !== "Saved") throw new Error(saved._tag);
      sandboxes.assign("Worker", saved.environment.id);
      const ran = await sandboxes.exec(request);
      expect(ran).toMatchObject({ _tag: "Ran", output: { exitCode: 0 } });
      expect(made).toEqual(["snap-1", "snap-2"]);
      expect(started).toEqual(["standard-2/snap-1", "standard-2/snap-2"]);
      // The new setup is the one kept: the next command starts from it, with no third setup.
      await sandboxes.exec({ ...request, run: "run-2" });
      expect(made).toHaveLength(2);
      expect(started.at(-1)).toBe("standard-2/snap-2");
    });
  });

  it("gives a command's own token as its environment only, and hides it in what comes back", () => {
    const { host } = expiring();
    return inObject(host, async (sandboxes) => {
      const saved = sandboxes.save({ name: "app", setup: "", size: "1 vCPU · 2 GB" });
      if (saved._tag !== "Saved") throw new Error(saved._tag);
      sandboxes.assign("Worker", saved.environment.id);
      const ran = await sandboxes.exec(request, { GH_TOKEN: "ghs_secret_value" });
      expect(ran).toMatchObject({ _tag: "Ran", output: { stdout: "token=[secret GH_TOKEN]" } });
      expect(JSON.stringify(sandboxes.environments())).not.toContain("ghs_secret_value");
    });
  });
});
