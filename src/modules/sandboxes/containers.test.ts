import { describe, expect, it } from "vitest";
import { cloudflareContainers, runInBox } from "./service.ts";
import type { BoxContainer, BoxResult, BoxRun, Boxes } from "./types.ts";

/** A container handle that records everything it was asked. No Docker, no network. */
function fakeContainer(script: { exitCode?: number; stdout?: string; stderr?: string; failStart?: boolean } = {}) {
  const calls: { start: unknown[]; exec: { command: string[]; env: Record<string, string> }[]; snapshots: string[]; destroyed: number } = {
    start: [],
    exec: [],
    snapshots: [],
    destroyed: 0,
  };
  const encode = (text: string): ArrayBuffer => new TextEncoder().encode(text).buffer as ArrayBuffer;
  const container: BoxContainer = {
    running: false,
    images: { base: "registry/dt-sandbox:1" },
    start: (options) => {
      if (script.failStart === true) throw new Error("no capacity");
      calls.start.push(options);
    },
    exec: async (command, options) => {
      calls.exec.push({ command, env: { ...options.env } });
      return {
        output: async () => ({ exitCode: script.exitCode ?? 0, stdout: encode(script.stdout ?? ""), stderr: encode(script.stderr ?? "") }),
      };
    },
    snapshotContainer: async ({ name }) => {
      calls.snapshots.push(name);
      return { id: "snap-1" };
    },
    destroy: async () => void (calls.destroyed += 1),
  };
  return { container, calls };
}

/** A namespace of boxes that runs each one over its own fake container, and remembers the runs. */
function fakeBoxes(script: Parameters<typeof fakeContainer>[0] = {}) {
  const runs: { name: string; input: BoxRun; calls: ReturnType<typeof fakeContainer>["calls"] }[] = [];
  const boxes: Boxes = {
    open: (name) => ({
      run: async (input): Promise<BoxResult> => {
        const { container, calls } = fakeContainer(script);
        runs.push({ name, input, calls });
        return runInBox(container, input, () => 1_000);
      },
    }),
  };
  return { boxes, runs };
}

const counter = (): (() => string) => {
  let n = 0;
  return () => `n${(n += 1)}`;
};

describe("Cloudflare Containers as the SandboxHost", () => {
  it("runs a setup once with its secrets as process environment, and keeps a snapshot, not a value", async () => {
    const { boxes, runs } = fakeBoxes({ stdout: "installed" });
    const host = cloudflareContainers(boxes, counter());
    const prepared = await host.prepare({ key: "env_1:2", script: "npm i", size: "2 vCPU · 4 GB", env: { NPM_TOKEN: "s3cret-value" } });
    expect(prepared).toEqual({ _tag: "Prepared", image: "standard-3/snap-1", seconds: 1 });
    const [run] = runs;
    expect(run?.name).toBe("setup-env-1-2-n1");
    expect(run?.input).toMatchObject({
      command: "npm i",
      env: { NPM_TOKEN: "s3cret-value" },
      instance: "standard-3",
      save: "if it succeeds",
    });
    expect(run?.calls.exec[0]?.command.slice(0, 2)).toEqual(["sh", "-c"]);
    expect(run?.calls.exec[0]?.command[2]).toMatch(/^mkdir -p \/workspace && cd \/workspace .*\nnpm i$/u);
    // The value reached exactly one place: the command's environment.
    const elsewhere = JSON.stringify({ start: run?.calls.start, snapshots: run?.calls.snapshots, image: prepared });
    expect(elsewhere).not.toContain("s3cret-value");
    expect(run?.calls.destroyed).toBe(1);
  });

  it("starts nothing for an empty setup, and maps each size to an instance type", async () => {
    const { boxes, runs } = fakeBoxes();
    const host = cloudflareContainers(boxes, counter());
    const sizes = ["1 vCPU · 2 GB", "2 vCPU · 4 GB", "4 vCPU · 8 GB"] as const;
    const images = await Promise.all(sizes.map((size) => host.prepare({ key: "k", script: "  ", size, env: {} })));
    expect(images.map((image) => (image._tag === "Prepared" ? image.image : ""))).toEqual(["standard-2/", "standard-3/", "standard-4/"]);
    expect(runs).toHaveLength(0);
  });

  it("reports a failing setup with its output, and a platform failure as unavailable, not as a failed setup", async () => {
    const failing = cloudflareContainers(fakeBoxes({ exitCode: 2, stdout: "out ", stderr: "boom" }).boxes, counter());
    expect(await failing.prepare({ key: "k", script: "false", size: "1 vCPU · 2 GB", env: {} })).toEqual({
      _tag: "SetupFailed",
      output: "out boom",
      seconds: 1,
    });
    const down = cloudflareContainers(fakeBoxes({ failStart: true }).boxes, counter());
    expect(await down.prepare({ key: "k", script: "true", size: "1 vCPU · 2 GB", env: {} })).toEqual({
      _tag: "Unavailable",
      reason: "Containers failed: no capacity",
    });
  });

  it("runs each command in a container from the kept snapshot and keeps what it left, with its secrets only as that command's environment", async () => {
    const { boxes, runs } = fakeBoxes({ stdout: "ok\n" });
    const host = cloudflareContainers(boxes, counter());
    const ran = await host.exec({ image: "standard-4/snap-9", command: "pnpm test", env: { GH_TOKEN: "tok-123" } });
    expect(ran).toEqual({ _tag: "Ran", output: { exitCode: 0, stdout: "ok\n", stderr: "", seconds: 1 }, kept: "standard-4/snap-1" });
    const run = runs[0];
    expect(run?.input).toMatchObject({ snapshot: "snap-9", instance: "standard-4", save: "always" });
    expect(run?.calls.start).toEqual([
      { containerSnapshot: { id: "snap-9" }, entrypoint: ["sleep", "infinity"], enableInternet: true, instance: "standard-4" },
    ]);
    expect(run?.calls.exec[0]?.env).toEqual({ GH_TOKEN: "tok-123" });
    expect(JSON.stringify(run?.calls.start)).not.toContain("tok-123");
    expect(run?.calls.snapshots).toEqual(["run"]);
    expect(run?.calls.destroyed).toBe(1);
  });

  it("starts from the plain image when the setup was empty, and refuses an image it did not make", async () => {
    const { boxes, runs } = fakeBoxes();
    const host = cloudflareContainers(boxes, counter());
    await host.exec({ image: "standard-2/", command: "ls", env: {} });
    expect(runs[0]?.calls.start).toEqual([
      { image: "registry/dt-sandbox:1", entrypoint: ["sleep", "infinity"], enableInternet: true, instance: "standard-2" },
    ]);
    expect(await host.exec({ image: "image:env_1:1", command: "ls", env: {} })).toMatchObject({ _tag: "Unavailable" });
  });

  it("marks an expired kept setup as expired, so the caller can run the setup again", async () => {
    const gone: Boxes = {
      open: () => ({
        run: async () => ({ exitCode: 1, stdout: "", stderr: "", seconds: 1, platformError: 'Snapshot "snap-9" was not found.' }),
      }),
    };
    const host = cloudflareContainers(gone, counter());
    expect(await host.exec({ image: "standard-2/snap-9", command: "ls", env: {} })).toEqual({
      _tag: "Unavailable",
      reason: "The kept setup is gone (Cloudflare snapshots expire)",
      expired: true,
    });
  });

  it("keeps a failing command's files, and what a command said when its files cannot be kept", async () => {
    const failing = cloudflareContainers(fakeBoxes({ exitCode: 1, stderr: "1 test failed" }).boxes, counter());
    expect(await failing.exec({ image: "standard-2/", command: "npm test", env: {} })).toMatchObject({
      output: { exitCode: 1, stderr: "1 test failed" },
      kept: "standard-2/snap-1",
    });
    const { container, calls } = fakeContainer({ stdout: "built" });
    const full: BoxContainer = {
      ...container,
      snapshotContainer: async () => {
        throw new Error("Snapshot too large");
      },
    };
    const boxes: Boxes = { open: () => ({ run: async (input) => runInBox(full, input, () => 1_000) }) };
    const ran = await cloudflareContainers(boxes, counter()).exec({ image: "standard-2/", command: "make", env: {} });
    expect(ran).toMatchObject({ _tag: "Ran", output: { exitCode: 0, stdout: "built" } });
    expect(ran).not.toHaveProperty("kept");
    expect(JSON.stringify(ran)).toContain("could not be kept");
    expect(calls.destroyed).toBe(1);
  });

  it("destroys the container and says why when the command's wait is cut off", async () => {
    const { container, calls } = fakeContainer();
    const cut: BoxContainer = {
      ...container,
      exec: async () => {
        throw new Error("The operation was aborted due to timeout");
      },
    };
    const result = await runInBox(cut, { command: "sleep 99", env: {}, instance: "standard-2", save: "always", timeoutMs: 1 }, () => 0);
    expect(result.platformError).toContain("timeout");
    expect(calls.destroyed).toBe(1);
  });
});
