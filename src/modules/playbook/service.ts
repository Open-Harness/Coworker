import { readFiles } from "./internal/reading.ts";
import { checkPlaybook } from "./internal/check.ts";
import { applyChanges } from "./internal/apply.ts";
import { changesBetween, changesOfFiles, linesOf, tableOfFiles } from "./internal/lines.ts";
import { mergeAll } from "./internal/merge.ts";
import { writeFiles } from "./internal/writing.ts";
import type { Playbooks } from "./types.ts";

export const playbooks: Playbooks = {
  read: readFiles,
  write: writeFiles,
  check: checkPlaybook,
  lines: linesOf,
  diff: (now, next) => {
    const a = tableOfFiles(now);
    const b = tableOfFiles(next);
    return "table" in a && "table" in b ? changesBetween(a.table, b.table) : changesOfFiles(now, next);
  },
  apply: applyChanges,
  merge: mergeAll,
};
