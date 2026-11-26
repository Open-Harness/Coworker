import type { Change, Files, Line, Playbook, Problem, ReadPlaybook } from "../types.ts";
import { decodeTable } from "./decode.ts";
import { readFiles } from "./reading.ts";
import type { Entry } from "./table.ts";
import { tableOf } from "./table.ts";
import { writeFiles } from "./writing.ts";

/** Every line a person can comment on, in reading order, with its text. */
export function linesOf(p: Playbook): readonly { readonly line: Line; readonly text: string }[] {
  return tableOf(p)
    .filter((e) => e.shown)
    .map((e) => ({ line: e.key, text: e.text }));
}

/** What a person is told a line is called: the lines that go along unseen are named by what they hold. */
export const publicName = (key: string): string => (key.startsWith("~file/") ? key.slice(6) : key.startsWith("~") ? key.slice(1) : key);

/** The playbook the lines make, written the one way and read again, or what is wrong with them. */
export function playbookOfTable(table: readonly Entry[]): ReadPlaybook {
  const made = decodeTable(table);
  return made.ok ? readFiles(writeFiles(made.playbook)) : { _tag: "Problems", problems: made.problems };
}

/** A playbook of files as a table, or what is wrong with the files. */
export function tableOfFiles(files: Files): { readonly table: readonly Entry[] } | { readonly problems: readonly Problem[] } {
  const read = readFiles(files);
  return read._tag === "Playbook" ? { table: tableOf(read.playbook) } : { problems: read.problems };
}

const textsOf = (table: readonly Entry[], shownOnly: boolean): Map<string, string> =>
  new Map(table.filter((e) => e.shown || !shownOnly).map((e) => [e.key, e.text]));

/** The lines whose text is not the same: `null` where a line is not there. Order: as in `now`, then what is new. */
export function changesBetween(now: readonly Entry[], next: readonly Entry[]): readonly Change[] {
  const before = textsOf(now, true);
  const after = textsOf(next, true);
  const keys = [...before.keys(), ...[...after.keys()].filter((k) => !before.has(k))];
  const out: Change[] = [];
  for (const line of keys) {
    const was = before.get(line) ?? null;
    const becomes = after.get(line) ?? null;
    if (was !== becomes) out.push({ line, was, becomes });
  }
  return out;
}

/** Files that cannot be read as a playbook are compared as files: each path is a line. */
export function changesOfFiles(now: Files, next: Files): readonly Change[] {
  const paths = [...Object.keys(now), ...Object.keys(next).filter((p) => !Object.hasOwn(now, p))];
  const out: Change[] = [];
  for (const line of paths) {
    const was = Object.hasOwn(now, line) ? (now[line] ?? null) : null;
    const becomes = Object.hasOwn(next, line) ? (next[line] ?? null) : null;
    if (was !== becomes) out.push({ line, was, becomes });
  }
  return out;
}
