import type { Change, Files, Problem, ReadPlaybook } from "../types.ts";
import { fileOf } from "./decode.ts";
import { playbookOfTable } from "./lines.ts";
import { readFiles } from "./reading.ts";
import type { Entry } from "./table.ts";
import { tableOf } from "./table.ts";

const groupOf = (key: string): string => (key.startsWith("~") ? "~" : (key.split("/")[0] ?? key));

function whyNot(c: Change, now: string | null): string | undefined {
  if (c.line === "objective") return "The line objective has nothing of its own: change what is under it.";
  if (c.was === null && now !== null) return `The line ${c.line} is there already, so it cannot be added.`;
  if (c.was !== null && now === null) return `The line ${c.line} is not there any more, so it cannot be changed or removed.`;
  if (c.was !== now) return `The line ${c.line} was changed after this was written, so it is not as it was.`;
  return undefined;
}

/** All changes, or none: each `was` must be the text of its line now. */
export function applyChanges(files: Files, changes: readonly Change[]): ReadPlaybook {
  const read = readFiles(files);
  if (read._tag === "Problems") return read;
  let table: Entry[] = [...tableOf(read.playbook)];
  const problems: Problem[] = [];
  for (const c of changes) {
    const at = table.findIndex((e) => e.shown && e.key === c.line);
    const why = whyNot(c, at < 0 ? null : (table[at]?.text ?? null));
    if (why !== undefined) {
      problems.push({ at: fileOf(c.line, c.becomes ?? c.was ?? ""), line: c.line, says: why });
      continue;
    }
    if (problems.length > 0) continue;
    if (at >= 0 && c.becomes === null) table = table.filter((_, i) => i !== at);
    else if (at >= 0 && c.becomes !== null) table = table.map((e, i) => (i === at ? { ...e, text: c.becomes ?? "" } : e));
    else if (c.becomes !== null) table = insertAtEndOfGroup(table, { key: c.line, text: c.becomes, shown: true });
  }
  return problems.length > 0 ? { _tag: "Problems", problems } : playbookOfTable(table);
}

function insertAtEndOfGroup(table: readonly Entry[], entry: Entry): Entry[] {
  const group = groupOf(entry.key);
  let last = -1;
  for (const [i, e] of table.entries()) if (groupOf(e.key) === group) last = i;
  const out = [...table];
  out.splice(last + 1, 0, entry);
  return out;
}
