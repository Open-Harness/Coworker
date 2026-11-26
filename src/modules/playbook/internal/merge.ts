import type { Clash, Files, Merged } from "../types.ts";
import { decodeTable } from "./decode.ts";
import { publicName, tableOfFiles } from "./lines.ts";
import { readFiles } from "./reading.ts";
import type { Entry } from "./table.ts";
import { writeFiles } from "./writing.ts";

const textMap = (table: readonly Entry[]): Map<string, string> => new Map(table.map((e) => [e.key, e.text]));

/**
 * The lines of a result, in an order that keeps the order of the base and puts what a side added after the line it came after:
 * what yours added first, so that theirs end up first.
 */
export function orderOf(base: readonly string[], sides: readonly (readonly string[])[]): readonly string[] {
  const out = [...base];
  const there = new Set(out);
  for (const side of sides)
    for (const [i, key] of side.entries()) {
      if (there.has(key)) continue;
      let at = -1;
      for (let j = i - 1; j >= 0 && at < 0; j -= 1) at = out.indexOf(side[j] ?? "");
      out.splice(at + 1, 0, key);
      there.add(key);
    }
  return out;
}

/** Three ways, line by line: one side changed it, it takes that; the same change twice is made once; two ways is a clash. */
function threeWay<K extends string>(keys: readonly K[], base: Map<K, string>, theirs: Map<K, string>, yours: Map<K, string>) {
  const kept: [K, string][] = [];
  const clashes: Clash[] = [];
  for (const key of keys) {
    const b = base.get(key) ?? null;
    const t = theirs.get(key) ?? null;
    const y = yours.get(key) ?? null;
    const pick = t === y || y === b ? t : t === b ? y : undefined;
    if (pick === undefined) clashes.push({ line: publicName(key), base: b, theirs: t, yours: y });
    else if (pick !== null) kept.push([key, pick]);
  }
  return { kept, clashes };
}

function mergeFiles(base: Files, theirs: Files, yours: Files): Merged {
  const paths = orderOf(Object.keys(base), [Object.keys(yours), Object.keys(theirs)]);
  const made = threeWay(paths, new Map(Object.entries(base)), new Map(Object.entries(theirs)), new Map(Object.entries(yours)));
  return made.clashes.length > 0 ? { _tag: "Clash", clashes: made.clashes } : { _tag: "Merged", files: Object.fromEntries(made.kept) };
}

/** Both sides' changes to one base, or every line that was changed in two ways. */
export function mergeAll(base: Files, theirs: Files, yours: Files): Merged {
  const b = tableOfFiles(base);
  const t = tableOfFiles(theirs);
  const y = tableOfFiles(yours);
  if (!("table" in b) || !("table" in t) || !("table" in y)) return mergeFiles(base, theirs, yours);
  const keys = orderOf(
    b.table.map((e) => e.key),
    [y.table.map((e) => e.key), t.table.map((e) => e.key)],
  );
  const bt = textMap(b.table);
  const tt = textMap(t.table);
  const yt = textMap(y.table);
  const { kept, clashes } = threeWay(keys, bt, tt, yt);
  if (clashes.length > 0) return { _tag: "Clash", clashes };
  const shown = new Set([...b.table, ...t.table, ...y.table].filter((e) => e.shown).map((e) => e.key));
  const made = decodeTable(kept.map(([key, text]) => ({ key, text, shown: shown.has(key) })));
  const files = made.ok ? writeFiles(made.playbook) : undefined;
  const read = files === undefined ? undefined : readFiles(files);
  if (files !== undefined && read?._tag === "Playbook") return { _tag: "Merged", files };
  const problems = made.ok ? (read?._tag === "Problems" ? read.problems : []) : made.problems;
  const lines = [...new Set(problems.map((p) => p.line ?? p.at))];
  return {
    _tag: "Clash",
    clashes: lines.map((line) => ({ line, base: bt.get(line) ?? null, theirs: tt.get(line) ?? null, yours: yt.get(line) ?? null })),
  };
}
