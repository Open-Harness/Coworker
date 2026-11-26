import { playbooks } from "~/modules/playbook/service.ts";
import type { Files, Playbook, Problem } from "~/modules/playbook/types.ts";

/**
 * What a person adds by hand to a playbook is theirs, and nothing else says why it is there: a line that only lacks a reason is given one,
 * "you said", and who said it. Any other problem is the person's to put right, so nothing is given until that is the only one.
 */
export function withReasons(
  files: Files,
  playbook: Playbook,
  problems: readonly Problem[],
  by: string,
): { readonly files: Files; readonly playbook: Playbook } | undefined {
  const lacking = problems.flatMap(({ at, line }) => (at === "because.yaml" && line !== undefined ? [line] : []));
  if (lacking.length === 0 || lacking.length !== problems.length) return undefined;
  const given: Playbook = {
    ...playbook,
    because: { ...playbook.because, ...Object.fromEntries(lacking.map((line) => [line, { why: "you said" as const, by }])) },
  };
  const written = playbooks.write(given)["because.yaml"];
  return written === undefined ? undefined : { files: { ...files, "because.yaml": written }, playbook: given };
}
