import type { Answer, AskResult, AuditLine, InboxRequest, QuestionDetail, Waiter } from "~/modules/manager/types.ts";
import type { AuditEntry, InboxItem, AnswerResult } from "../types.ts";

/*
 * The Inbox and the action log, in the Workspace object. Managers write both by idempotent calls: an item per id, a
 * log line per key.
 */

interface ItemRow extends Record<string, SqlStorageValue> {
  id: string;
  kind: string;
  to_person: string;
  manager_id: string;
  manager_name: string;
  title: string;
  options: string;
  task: string | null;
  detail: string | null;
  created_at: number;
  answer: string | null;
  waiters: string;
}

const itemOf = (row: ItemRow): InboxItem => ({
  id: row.id,
  kind: row.kind === "approval" || row.kind === "notice" ? row.kind : "question",
  to: row.to_person,
  managerId: row.manager_id,
  managerName: row.manager_name,
  title: row.title,
  options: JSON.parse(row.options) as string[],
  ...(row.task === null ? {} : { task: row.task }),
  ...(row.detail === null ? {} : { detail: JSON.parse(row.detail) as QuestionDetail }),
  createdAt: row.created_at,
  ...(row.answer === null ? {} : { answer: JSON.parse(row.answer) as Answer }),
});

const rowOf = (sql: SqlStorage, id: string): ItemRow | undefined =>
  sql.exec<ItemRow>("SELECT * FROM inbox_item WHERE id = ?", id).toArray()[0];

/** Adds the item once. Sent again, it gains the new waiter, or answers at once if a person already did. */
export function ask(sql: SqlStorage, request: InboxRequest, now: number): AskResult {
  const existing = rowOf(sql, request.id);
  if (existing?.answer !== null && existing?.answer !== undefined)
    return { _tag: "Answered", answer: JSON.parse(existing.answer) as Answer };
  if (existing !== undefined) {
    const waiters = JSON.parse(existing.waiters) as Waiter[];
    if (!waiters.some(({ taskId, key }) => taskId === request.waiter.taskId && key === request.waiter.key)) waiters.push(request.waiter);
    sql.exec("UPDATE inbox_item SET waiters = ? WHERE id = ?", JSON.stringify(waiters), request.id);
    return { _tag: "Asked" };
  }
  sql.exec(
    "INSERT INTO inbox_item (id, kind, to_person, manager_id, manager_name, title, options, task, detail, created_at, waiters) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    request.id,
    request.kind,
    request.to,
    request.managerId,
    request.managerName,
    request.title,
    JSON.stringify(request.options),
    request.task ?? null,
    request.detail === undefined ? null : JSON.stringify(request.detail),
    now,
    JSON.stringify([request.waiter]),
  );
  return { _tag: "Asked" };
}

/** Something an Owner should know, from the workspace itself: nothing to answer, no manager waiting. */
export function notify(sql: SqlStorage, notice: { readonly id: string; readonly to: string; readonly title: string }, now: number): void {
  sql.exec(
    "INSERT INTO inbox_item (id, kind, to_person, manager_id, manager_name, title, options, created_at, waiters) VALUES (?, 'notice', ?, '', 'Co-worker', ?, '[]', ?, '[]') ON CONFLICT (id) DO NOTHING",
    notice.id,
    notice.to,
    notice.title,
    now,
  );
}

export const inboxOf = (sql: SqlStorage, personId: string): readonly InboxItem[] =>
  sql
    .exec<ItemRow>("SELECT * FROM inbox_item WHERE to_person = ? ORDER BY answer IS NOT NULL, created_at, id", personId)
    .toArray()
    .map(itemOf);

/** Records the answer once, by the person it was for. The caller delivers it to the waiters. */
export function answerItem(
  sql: SqlStorage,
  itemId: string,
  answer: Answer,
): { readonly result: AnswerResult; readonly waiters: readonly Waiter[] } {
  const row = rowOf(sql, itemId);
  if (row === undefined || row.to_person !== answer.byId) return { result: { _tag: "NoSuchItem" }, waiters: [] };
  if (row.answer !== null) return { result: { _tag: "AlreadyAnswered" }, waiters: [] };
  sql.exec("UPDATE inbox_item SET answer = ? WHERE id = ?", JSON.stringify(answer), itemId);
  return {
    result: { _tag: "Answered", item: itemOf({ ...row, answer: JSON.stringify(answer) }) },
    waiters: JSON.parse(row.waiters) as Waiter[],
  };
}

export function recordActions(sql: SqlStorage, lines: readonly AuditLine[]): void {
  for (const { key, managerId, record } of lines) {
    sql.exec(
      `INSERT INTO action_log (key, manager_id, at, action, by_kind, by_id, by_name, permission, approved_by, sentence, outcome)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (key) DO NOTHING`,
      key,
      managerId,
      record.at,
      record.action,
      record.by.kind,
      record.by.id,
      record.by.name,
      record.permission,
      record.approvedBy ?? null,
      record.sentence,
      record.outcome,
    );
  }
}

interface LogRow extends Record<string, SqlStorageValue> {
  manager_id: string;
  at: number;
  action: string;
  by_kind: string;
  by_id: string;
  by_name: string;
  permission: string;
  approved_by: string | null;
  sentence: string;
  outcome: string;
}

export const auditLog = (sql: SqlStorage, limit: number): readonly AuditEntry[] =>
  sql
    .exec<LogRow>("SELECT * FROM action_log ORDER BY at DESC, key DESC LIMIT ?", limit)
    .toArray()
    .map((row) => ({
      managerId: row.manager_id,
      at: row.at,
      action: row.action,
      by: { kind: row.by_kind === "person" ? "person" : "manager", id: row.by_id, name: row.by_name },
      permission: row.permission === "ask" ? "ask" : row.permission === "off" ? "off" : "on",
      ...(row.approved_by === null ? {} : { approvedBy: row.approved_by }),
      sentence: row.sentence,
      outcome: row.outcome as AuditEntry["outcome"],
    }));
