import { playbooks } from "~/modules/playbook/service.ts";
import type { Change, Clash } from "~/modules/playbook/types.ts";
import type { Copy, Newer, Template } from "../types.ts";
import { inferValues } from "./infer.ts";
import { putValues } from "./put.ts";

/**
 * What a newer template would change here. The template as this manager would have it (its own values in the blanks) is
 * compared with what the manager was given, and the manager's own edits are compared with that too: a line only the template
 * changed is a change, a line both changed in two ways is a clash, and the same change on both is neither.
 */
export function newerOf(copy: Copy, template: Template): Newer {
  if (template.version <= copy.version) return { _tag: "Same" };
  const values = inferValues(template, copy.given);
  const next = putValues(template.files, template.blanks, values);
  const yours = new Map(playbooks.diff(copy.given, copy.now).map((c) => [c.line, c]));
  const changes: Change[] = [];
  const clashes: Clash[] = [];
  for (const theirs of playbooks.diff(copy.given, next)) {
    const mine = yours.get(theirs.line);
    if (mine === undefined) changes.push({ line: theirs.line, was: theirs.was, becomes: theirs.becomes });
    else if (mine.becomes !== theirs.becomes)
      clashes.push({ line: theirs.line, base: theirs.was, theirs: theirs.becomes, yours: mine.becomes });
  }
  if (changes.length === 0 && clashes.length === 0) return { _tag: "Same" };
  return { _tag: "Suggestion", version: template.version, changes, clashes };
}
