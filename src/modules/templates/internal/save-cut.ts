import { isSeq, parseDocument } from "yaml";
import type { Files, Path } from "~/modules/playbook/types.ts";

/* What goes without a blank: a secret, wherever it is written, and the cases of every eval. */

export type Gone = readonly { readonly at: Path; readonly says: string }[];

const secret = /(?<![A-Za-z0-9])(?:ghp_|sk-|xoxb-|AKIA)[A-Za-z0-9_-]+/gu;

/** The files without secrets, and which files had one. */
export function cutSecrets(files: Files): { readonly files: Files; readonly gone: Gone } {
  const entries = Object.entries(files).map(([path, text]) => [path, text.replace(secret, "")] as const);
  const gone = Object.entries(files)
    .filter(([path, text]) => text !== files[path]?.replace(secret, ""))
    .map(([path]) => ({ at: path, says: "A secret was cut out of this file." }));
  return { files: Object.fromEntries(entries), gone };
}

/** The eval files that have cases. */
export function filesWithCases(files: Files): readonly Path[] {
  return Object.entries(files)
    .filter(([path]) => /^evals\/.+\.ya?ml$/u.test(path))
    .filter(([, text]) => {
      const doc = parseDocument(text);
      const cases = doc.errors.length > 0 ? null : doc.get("cases", true);
      return isSeq(cases) && cases.items.length > 0;
    })
    .map(([path]) => path);
}

export const casesGone = (paths: readonly Path[]): Gone => paths.map((at) => ({ at, says: "The cases of this eval were left out." }));
