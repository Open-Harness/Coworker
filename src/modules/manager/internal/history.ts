import type { Tx } from "@earendil-works/pi-durable";
import type { ActionRecord } from "~/modules/actions/types.ts";
import { BoardDoc } from "./state.ts";

/**
 * A task's history is the audit line's own sentence, kept on the task too, so the line, the history and the ask prompt
 * cannot drift apart. Only what was done (not asked, refused or failed) and named a task is kept.
 */

const MAX_HISTORY = 200;
const TASK = /^(?:dt-)?(\d+)$/iu;

const taskOf = (record: ActionRecord, value: unknown): string | undefined => {
  const named = (candidate: unknown): string | undefined => {
    const number = typeof candidate === "string" ? TASK.exec(candidate.trim())?.[1] : undefined;
    return number === undefined ? undefined : `DT-${number}`;
  };
  const input = typeof record.input === "object" && record.input !== null ? (record.input as Record<string, unknown>) : {};
  const result = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return named(result["task"]) ?? named(input["task"]);
};

/** Adds each done line to the task it names. A comment is already its own entry. */
export async function noteHistory(tx: Tx, records: readonly ActionRecord[], value: unknown): Promise<void> {
  const named = records.flatMap((record) =>
    record.outcome === "done" && record.action !== "task.comment" ? [[record, taskOf(record, value)] as const] : [],
  );
  if (named.every(([, task]) => task === undefined)) return;
  const board = await tx.doc(BoardDoc);
  for (const [record, id] of named) {
    const task = id === undefined ? undefined : board.tasks[id];
    if (task === undefined) continue;
    // Written through the task, so the document sees the new array.
    task.history ??= [];
    task.history.push({ at: record.at, by: { kind: record.by.kind, id: record.by.id, name: record.by.name }, sentence: record.sentence });
    if (task.history.length > MAX_HISTORY) task.history.splice(0, task.history.length - MAX_HISTORY);
  }
}
