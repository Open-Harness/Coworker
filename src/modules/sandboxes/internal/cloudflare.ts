import type { BoxResult, Boxes, Instance, Size, SandboxHost } from "../types.ts";

/** Each size on the platform's instance type with at least that much (the platform has no 2 GB or 8 GB type). */
const INSTANCES: Readonly<Record<Size, Instance>> = {
  "1 vCPU · 2 GB": "standard-2",
  "2 vCPU · 4 GB": "standard-3",
  "4 vCPU · 8 GB": "standard-4",
};

const SETUP_TIMEOUT_MS = 15 * 60_000;
const COMMAND_TIMEOUT_MS = 10 * 60_000;
const NOT_KEPT = "\n(The files this command made could not be kept.)";

/** A kept setup is named `<instance>/<snapshot id>`; no snapshot id means the plain image. */
const imageName = (instance: Instance, snapshot: string | undefined): string => `${instance}/${snapshot ?? ""}`;

function parseImage(image: string): { readonly instance: Instance; readonly snapshot: string | undefined } | undefined {
  const [instance, snapshot] = image.split("/");
  const known = Object.values(INSTANCES).find((candidate) => candidate === instance);
  return known === undefined ? undefined : { instance: known, snapshot: snapshot === "" ? undefined : snapshot };
}

/** A platform failure is not the command's: say so, and say it plainly when the kept setup has expired (snapshots do). */
const unavailable = (result: BoxResult): { readonly _tag: "Unavailable"; readonly reason: string; readonly expired?: true } | undefined =>
  result.platformError === undefined
    ? undefined
    : /snapshot.*(not found|expired)/iu.test(result.platformError)
      ? {
          _tag: "Unavailable",
          reason: "The kept setup is gone (Cloudflare snapshots expire)",
          expired: true,
        }
      : { _tag: "Unavailable", reason: `Containers failed: ${result.platformError}` };

/**
 * `SandboxHost` on Cloudflare Containers. A setup runs once in its own container and the container's root filesystem
 * is snapshotted: that snapshot is the "image" kept for the version. Each command
 * starts a container from the image it is given and leaves a new one, which the run's next command starts from.
 * `env` is only ever the process environment of one command.
 */
export function cloudflareContainers(boxes: Boxes, id: () => string): SandboxHost {
  return {
    prepare: async ({ key, script, size, env }) => {
      const instance = INSTANCES[size];
      if (script.trim() === "") return { _tag: "Prepared", image: imageName(instance, undefined), seconds: 0 };
      const result = await boxes.open(`setup-${key.replace(/[^A-Za-z0-9-]/gu, "-")}-${id()}`).run({
        command: script,
        env,
        instance,
        save: "if it succeeds",
        timeoutMs: SETUP_TIMEOUT_MS,
      });
      const down = unavailable(result);
      if (down !== undefined) return down;
      if (result.exitCode !== 0 || result.snapshot === undefined) {
        return { _tag: "SetupFailed", output: `${result.stdout}${result.stderr}`, seconds: result.seconds };
      }
      return { _tag: "Prepared", image: imageName(instance, result.snapshot), seconds: result.seconds };
    },
    exec: async ({ image, command, env }) => {
      const from = parseImage(image);
      if (from === undefined) return { _tag: "Unavailable", reason: "This image was not made by Cloudflare Containers" };
      const result = await boxes.open(`run-${id()}`).run({
        command,
        env,
        instance: from.instance,
        snapshot: from.snapshot,
        save: "always",
        timeoutMs: COMMAND_TIMEOUT_MS,
      });
      const down = unavailable(result);
      if (down !== undefined) return down;
      const { exitCode, stdout, seconds, snapshot } = result;
      if (snapshot === undefined) return { _tag: "Ran", output: { exitCode, stdout, stderr: `${result.stderr}${NOT_KEPT}`, seconds } };
      return { _tag: "Ran", output: { exitCode, stdout, stderr: result.stderr, seconds }, kept: imageName(from.instance, snapshot) };
    },
  };
}
