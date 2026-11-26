import type { Answer } from "~/modules/manager/types.ts";
import type { JoinRequester, RequestJoinResult } from "../types.ts";

/*
 * Requests to join (model.md "Where data lives"): one approval in every Owner's Inbox. The first answer counts: it
 * decides the request and answers every other Owner's item with the same words.
 */

export const REQUEST_MIGRATIONS: readonly string[] = [
  `CREATE TABLE join_request (
     user_id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, round INTEGER NOT NULL,
     status TEXT NOT NULL, asked_at INTEGER NOT NULL, decided_by TEXT)`,
  "CREATE TABLE join_item (item_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, round INTEGER NOT NULL)",
];

/** The two buttons of a request's item. */
export const JOIN_OPTIONS: readonly string[] = ["Let them in", "Say no"];

interface RequestRow extends Record<string, SqlStorageValue> {
  user_id: string;
  round: number;
  status: string;
}

/** Asks every Owner once. Asking again while one waits changes nothing. */
export function requestJoin(sql: SqlStorage, person: JoinRequester, owners: readonly string[], now: number): RequestJoinResult {
  const existing = sql.exec<RequestRow>("SELECT * FROM join_request WHERE user_id = ?", person.userId).toArray()[0];
  if (existing?.status === "pending") return { _tag: "AlreadyRequested" };
  const round = (existing?.round ?? 0) + 1;
  sql.exec(
    `INSERT INTO join_request (user_id, email, name, round, status, asked_at) VALUES (?, ?, ?, ?, 'pending', ?)
     ON CONFLICT (user_id) DO UPDATE SET email = excluded.email, name = excluded.name, round = excluded.round,
       status = 'pending', asked_at = excluded.asked_at, decided_by = NULL`,
    person.userId,
    person.email,
    person.name,
    round,
    now,
  );
  for (const owner of owners) {
    const id = `join:${person.userId}:${round}:${owner}`;
    sql.exec(
      `INSERT INTO inbox_item (id, kind, to_person, manager_id, manager_name, title, options, created_at, waiters)
       VALUES (?, 'approval', ?, '', 'Co-worker', ?, ?, ?, '[]')`,
      id,
      owner,
      `${person.name} (${person.email}) asks to join`,
      JSON.stringify(JOIN_OPTIONS),
      now,
    );
    sql.exec("INSERT INTO join_item (item_id, user_id, round) VALUES (?, ?, ?)", id, person.userId, round);
  }
  return { _tag: "Requested" };
}

/**
 * After an Owner answered `itemId`: decides its request if it still waits, answers the other Owners' items alike, and
 * returns who to add as a Member. Undefined when the item is not a request's, or the request was already decided.
 */
export function settleJoin(sql: SqlStorage, itemId: string, answer: Answer): { readonly admit: string | undefined } | undefined {
  const link = sql.exec<{ user_id: string; round: number }>("SELECT user_id, round FROM join_item WHERE item_id = ?", itemId).toArray()[0];
  if (link === undefined) return undefined;
  const request = sql.exec<RequestRow>("SELECT * FROM join_request WHERE user_id = ? AND round = ?", link.user_id, link.round).toArray()[0];
  if (request?.status !== "pending") return undefined;
  const approved = answer.decision === "allow" || answer.decision === "always";
  sql.exec(
    "UPDATE join_request SET status = ?, decided_by = ? WHERE user_id = ?",
    approved ? "approved" : "declined",
    answer.byId,
    link.user_id,
  );
  sql.exec(
    "UPDATE inbox_item SET answer = ? WHERE answer IS NULL AND id IN (SELECT item_id FROM join_item WHERE user_id = ? AND round = ?)",
    JSON.stringify(answer),
    link.user_id,
    link.round,
  );
  return { admit: approved ? link.user_id : undefined };
}
