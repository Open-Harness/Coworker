/*
 * Each Inbox item is offered once to what people chose to be mailed (the settings module decides). `notice_sent` is
 * that "once": a row per item already offered. Items from before this table were offered then.
 */

export const NOTICE_MIGRATIONS: readonly string[] = [
  "CREATE TABLE notice_sent (item_id TEXT PRIMARY KEY, at INTEGER NOT NULL)",
  "INSERT INTO notice_sent (item_id, at) SELECT id, 0 FROM inbox_item",
];

export interface Offered {
  readonly id: string;
  readonly kind: "question" | "approval" | "notice";
  readonly to: string;
  readonly title: string;
  readonly from: string;
}

/** The open items nobody has offered yet, now marked as offered. */
export function takeUnoffered(sql: SqlStorage, now: number): readonly Offered[] {
  const rows = sql
    .exec<{ id: string; kind: string; to_person: string; title: string; manager_name: string }>(
      `SELECT id, kind, to_person, title, manager_name FROM inbox_item
       WHERE answer IS NULL AND id NOT IN (SELECT item_id FROM notice_sent) ORDER BY created_at, id LIMIT 100`,
    )
    .toArray();
  for (const { id } of rows) sql.exec("INSERT OR IGNORE INTO notice_sent (item_id, at) VALUES (?, ?)", id, now);
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind === "approval" || row.kind === "notice" ? row.kind : "question",
    to: row.to_person,
    title: row.title,
    from: row.manager_name,
  }));
}
