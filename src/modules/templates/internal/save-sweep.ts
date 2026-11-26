import { isMap, visit, type Document } from "yaml";
import type { Files } from "~/modules/playbook/types.ts";
import { editFiles, type Edits } from "./edit.ts";

/* One manager's own things, swapped for the blanks that stand for them, in every file. */

export interface Swap {
  /** What is written now, and the blank that stands for it. */
  readonly words: ReadonlyMap<string, string>;
  /** `agents/doer.md` to the blank that stands for its model. */
  readonly models: ReadonlyMap<string, string>;
}

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

function wordsPattern(words: ReadonlyMap<string, string>): RegExp | null {
  if (words.size === 0) return null;
  const longest = [...words.keys()].sort((a, b) => b.length - a.length || a.localeCompare(b));
  return new RegExp(`(?<![A-Za-z0-9_-])(?:${longest.map(escape).join("|")})(?![A-Za-z0-9_-])`, "gu");
}

/** The files with each word swapped (once, never inside what was put in), the model of each agent a blank, cases empty; and the blanks used. */
export function sweep(
  files: Files,
  swap: Swap,
  casePaths: ReadonlySet<string>,
): { readonly files: Files; readonly used: ReadonlySet<string> } {
  const used = new Set<string>();
  const pattern = wordsPattern(swap.words);
  const text = (s: string): string =>
    pattern === null
      ? s
      : s.replace(pattern, (word) => {
          const id = swap.words.get(word) ?? "";
          used.add(id);
          return `{{${id}}}`;
        });
  const doc = (d: Document, path: string): boolean => {
    let changed = false;
    const model = swap.models.get(path);
    if (model !== undefined && isMap(d.contents) && isMap(d.get("model", true))) {
      d.set("model", `{{${model}}}`);
      used.add(model);
      changed = true;
    }
    if (casePaths.has(path)) {
      d.set("cases", d.createNode([]));
      changed = true;
    }
    visit(d, {
      Scalar(_key, node) {
        if (typeof node.value !== "string") return;
        const swapped = text(node.value);
        if (swapped === node.value) return;
        node.value = swapped;
        changed = true;
      },
    });
    return changed;
  };
  const edits: Edits = { doc, text };
  return { files: editFiles(files, edits), used };
}
