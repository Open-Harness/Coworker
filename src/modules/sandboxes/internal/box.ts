import type { BoxContainer, BoxResult, BoxRun } from "../types.ts";

const decode = (bytes: ArrayBuffer): string => new TextDecoder().decode(bytes);

/**
 * The image is Docker Hub's own Node image, copied to Cloudflare's registry, so nobody builds one. What it lacks is done
 * here: commands start in /workspace, and pnpm and yarn are there.
 */
const START = "mkdir -p /workspace && cd /workspace && { corepack enable 2>/dev/null || true; }";

const failed = (message: string, seconds: number): BoxResult => ({ exitCode: 1, stdout: "", stderr: "", seconds, platformError: message });

/** A setup that can't be saved is a failed start. A command that can't still says what it said. */
async function saved(container: BoxContainer, { save }: BoxRun, exitCode: number): Promise<string | undefined> {
  if (save === "if it succeeds") return exitCode === 0 ? (await container.snapshotContainer({ name: "setup" })).id : undefined;
  return container.snapshotContainer({ name: "run" }).then(
    ({ id }) => id,
    () => undefined,
  );
}

/**
 * One command in one fresh container: start it (from the snapshot, or the image), run the command with `env` as that
 * process's environment, save the root filesystem as it asks, and always destroy the container. Nothing is thrown:
 * a platform failure is a result with exit code 1 and its message.
 */
export async function runInBox(container: BoxContainer, input: BoxRun, now: () => number): Promise<BoxResult> {
  const began = now();
  const seconds = (): number => Math.max(1, Math.ceil((now() - began) / 1000));
  try {
    const image = Object.values(container.images)[0];
    if (input.snapshot === undefined && image === undefined) return failed("The Worker has no container image bound", seconds());
    if (!container.running) {
      const from = input.snapshot === undefined ? { image: image ?? "" } : { containerSnapshot: { id: input.snapshot } };
      container.start({ ...from, entrypoint: ["sleep", "infinity"], enableInternet: true, instance: input.instance });
    }
    const process = await container.exec(["sh", "-c", `${START}\n${input.command}`], {
      env: input.env,
      signal: AbortSignal.timeout(input.timeoutMs),
    });
    const output = await process.output();
    const snapshot = await saved(container, input, output.exitCode);
    return { exitCode: output.exitCode, stdout: decode(output.stdout), stderr: decode(output.stderr), seconds: seconds(), snapshot };
  } catch (error) {
    return failed(error instanceof Error ? error.message : String(error), seconds());
  } finally {
    await container.destroy().catch(() => undefined);
  }
}
