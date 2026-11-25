import { CATALOGUE } from "~/modules/actions/service.ts";
import type { AuditQuery } from "~/modules/actions/types.ts";
import type { AuditEntry, AuditPage } from "../types.ts";

/** The audit log with its filters: who, where, which category, which permission, when. Newest first, in pages. */

interface Row extends Record<string, SqlStorageValue> {
  key: string;
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

const entryOf = (row: Row): AuditEntry => ({
  managerId: row.manager_id,
  at: row.at,
  action: row.action,
  by: { kind: row.by_kind === "person" ? "person" : "manager", id: row.by_id, name: row.by_name },
  permission: row.permission === "ask" ? "ask" : row.permission === "off" ? "off" : "on",
  ...(row.approved_by === null ? {} : { approvedBy: row.approved_by }),
  sentence: row.sentence,
  outcome: row.outcome as AuditEntry["outcome"],
});

/** The condition for one category: a catalogue category's actions, or the workspace's own `settings.*` lines. */
function categoryTest(category: string): { readonly sql: string; readonly args: readonly string[] } {
  if (category === "settings") return { sql: "action LIKE 'settings.%'", args: [] };
  const ids = CATALOGUE.filter((spec) => spec.category === category).map(({ id }) => id);
  return ids.length === 0 ? { sql: "0", args: [] } : { sql: `action IN (${ids.map(() => "?").join(", ")})`, args: ids };
}

const MAX_PAGE = 500;

export function queryAudit(sql: SqlStorage, query: AuditQuery): AuditPage {
  const where: string[] = [];
  const args: SqlStorageValue[] = [];
  const add = (condition: string, ...values: SqlStorageValue[]): void => void (where.push(condition), args.push(...values));
  if (query.by !== undefined) add("by_id = ?", query.by);
  if (query.kind !== undefined) add("by_kind = ?", query.kind);
  if (query.manager !== undefined) add("manager_id = ?", query.manager);
  if (query.permission !== undefined) add("permission = ?", query.permission);
  if (query.outcome !== undefined) add("outcome = ?", query.outcome);
  if (query.since !== undefined) add("at >= ?", query.since);
  if (query.until !== undefined) add("at < ?", query.until);
  if (query.category !== undefined) {
    const test = categoryTest(query.category);
    add(test.sql, ...test.args);
  }
  const [cursorAt, cursorKey] = (query.before ?? "").split(/:(.*)/su);
  if (cursorAt !== undefined && cursorKey !== undefined && Number.isFinite(Number(cursorAt)))
    add("(at < ? OR (at = ? AND key < ?))", Number(cursorAt), Number(cursorAt), cursorKey);
  const limit = Math.min(Math.max(Math.trunc(query.limit ?? 200), 1), MAX_PAGE);
  const rows = sql
    .exec<Row>(
      `SELECT * FROM action_log ${where.length === 0 ? "" : `WHERE ${where.join(" AND ")}`} ORDER BY at DESC, key DESC LIMIT ?`,
      ...args,
      limit + 1,
    )
    .toArray();
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return { entries: page.map(entryOf), ...(rows.length > limit && last !== undefined ? { next: `${last.at}:${last.key}` } : {}) };
}
