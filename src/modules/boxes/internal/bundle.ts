import type { BoxHandle, Bundle } from "../types.ts";
import type { Place } from "./open.ts";

const FILE = ".git/co-worker.bundle";

const bytesOf = (base64: string): Uint8Array => Uint8Array.from(atob(base64.trim()), (char) => char.charCodeAt(0));

const quoted = (word: string): string => `'${word.replaceAll("'", `'\\''`)}'`;

/** A branch of the clone, as git bundles it: from where it left the default branch, to where it is. */
export async function bundleOf(
  box: BoxHandle,
  place: Place,
  branch: string,
): Promise<Bundle | { readonly _tag: "Unavailable"; readonly why: string }> {
  const b = quoted(branch);
  const run = (command: string) => box.exec(command, { seconds: 60 });
  const base = await run(`git merge-base ${quoted(`origin/${place.base}`)} ${b}`);
  const head = await run(`git rev-parse ${b}`);
  if (base.exitCode !== 0 || head.exitCode !== 0)
    return { _tag: "Unavailable", why: `There is no branch ${branch} in the box yet: ${(base.stderr + head.stderr).trim().slice(0, 200)}` };
  const [from, to] = [base.stdout.trim(), head.stdout.trim()];
  const files = await run(`git diff --name-only ${from} ${to}`);
  const made = await run(`git bundle create ${FILE} ${b} ^${from} 2>&1 && base64 < ${FILE} | tr -d '\\n'`);
  if (made.exitCode !== 0) return { _tag: "Unavailable", why: `The branch could not be bundled: ${made.stdout.slice(0, 200)}` };
  const encoded = made.stdout.split("\n").at(-1) ?? "";
  return {
    repo: place.repo,
    branch,
    base: from,
    head: to,
    files: files.stdout.split("\n").filter((line) => line !== ""),
    bytes: bytesOf(encoded),
  };
}
