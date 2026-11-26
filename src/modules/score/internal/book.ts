import type { BookError, BookEval, EvalKind } from "../types.ts";

const KINDS: readonly EvalKind[] = ["gate", "acc", "flw", "ui", "live", "spike"];
const EVAL_LINE = /^- `((gate|acc|flw|ui|live|spike):[\w./-]+)` (.*)$/u;
const MILESTONE = /^### (\d|Alongside) · (.+?)(?: \(.*)?$/u;
const LANE = /^#### .*\(lane: (\w+)/u;
const EVAL_NAME = /^(gate|acc|flw|ui|live|spike):[\w./-]+$/u;

export const isEvalName = (name: string): boolean => EVAL_NAME.test(name);

const isKind = (value: string): value is EvalKind => (KINDS as readonly string[]).includes(value);

interface Draft {
  id: string;
  kind: EvalKind;
  milestone: string;
  milestoneName: string;
  lane: string;
  claim: string;
}

/** Evals are list items that start with an id in backticks, under a milestone heading of section 4. */
export function parseBook(markdown: string): readonly BookEval[] | BookError {
  const found: Draft[] = [];
  let milestone = "";
  let milestoneName = "";
  let lane = "";
  let current: Draft | undefined;
  for (const line of markdown.split("\n")) {
    const heading = MILESTONE.exec(line);
    if (heading !== null) {
      milestone = heading[1] === "Alongside" ? "spike" : (heading[1] ?? "");
      milestoneName = (heading[2] ?? "").trim();
      current = undefined;
      continue;
    }
    const laneHeading = LANE.exec(line);
    if (laneHeading !== null) {
      lane = laneHeading[1] ?? "";
      current = undefined;
      continue;
    }
    if (line.startsWith("## ") && !line.startsWith("## 4")) milestone = "";
    const item = EVAL_LINE.exec(line);
    const kind = item?.[2] ?? "";
    if (item !== null && milestone !== "" && isKind(kind)) {
      current = { id: item[1] ?? "", kind, milestone, milestoneName, lane, claim: item[3] ?? "" };
      found.push(current);
      continue;
    }
    if (current !== undefined && line.startsWith("  ") && line.trim() !== "") current.claim += ` ${line.trim()}`;
    else current = undefined;
  }
  if (found.length === 0) return { _tag: "EmptyBook" };
  const seen = new Set<string>();
  for (const entry of found) {
    if (seen.has(entry.id)) return { _tag: "DuplicateInBook", id: entry.id };
    seen.add(entry.id);
  }
  return found;
}
