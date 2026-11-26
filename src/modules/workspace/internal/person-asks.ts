import type { Answer } from "../types.ts";
import type { ApprovalRequest } from "~/modules/actions/types.ts";

/*
 * A person whose own setting for an action is ask presses its button and the call waits: one approval in each Owner's
 * Inbox, the first answer decides it and answers the others alike. Allowed, it runs as that person's press, with the
 * Owner as the one who approved; denied, it leaves a refused line.
 */

export const ASK_MIGRATIONS: readonly string[] = [
  `CREATE TABLE person_ask (
     request_id TEXT PRIMARY KEY, manager_id TEXT NOT NULL, action TEXT NOT NULL, input TEXT NOT NULL, by_id TEXT NOT NULL,
     by_name TEXT NOT NULL, preset TEXT NOT NULL, sentence TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  "CREATE TABLE person_ask_item (item_id TEXT PRIMARY KEY, request_id TEXT NOT NULL)",
];

export const ASK_OPTIONS: readonly string[] = ["Allow once", "Deny"];

/** Asks each approver once. The same request again changes nothing. */
export function requestApproval(
  sql: SqlStorage,
  call: ApprovalRequest,
  approvers: readonly string[],
  managerName: string,
  now: number,
): { readonly _tag: "Requested" | "AlreadyRequested" } {
  if (sql.exec("SELECT 1 FROM person_ask WHERE request_id = ?", call.requestId).toArray().length > 0) return { _tag: "AlreadyRequested" };
  sql.exec(
    `INSERT INTO person_ask (request_id, manager_id, action, input, by_id, by_name, preset, sentence, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    call.requestId,
    call.managerId,
    call.actionId,
    JSON.stringify(call.input),
    call.by.id,
    call.by.name,
    call.preset,
    call.sentence,
    now,
  );
  for (const approver of approvers) {
    const id = `ask:${call.requestId}:${approver}`;
    sql.exec(
      `INSERT INTO inbox_item (id, kind, to_person, manager_id, manager_name, title, options, created_at, waiters)
       VALUES (?, 'approval', ?, ?, ?, ?, ?, ?, '[]')`,
      id,
      approver,
      call.managerId,
      managerName,
      call.sentence,
      JSON.stringify(ASK_OPTIONS),
      now,
    );
    sql.exec("INSERT INTO person_ask_item (item_id, request_id) VALUES (?, ?)", id, call.requestId);
  }
  return { _tag: "Requested" };
}

export interface Settled {
  readonly request: ApprovalRequest;
  readonly approved: boolean;
}

/** After an approver answered `itemId`: decides the request if it still waits and answers the other approvers alike. */
export function settleApproval(sql: SqlStorage, itemId: string, answer: Answer): Settled | undefined {
  const link = sql.exec<{ request_id: string }>("SELECT request_id FROM person_ask_item WHERE item_id = ?", itemId).toArray()[0];
  if (link === undefined) return undefined;
  const row = sql
    .exec<{
      manager_id: string;
      action: string;
      input: string;
      by_id: string;
      by_name: string;
      preset: string;
      sentence: string;
      status: string;
    }>("SELECT * FROM person_ask WHERE request_id = ?", link.request_id)
    .toArray()[0];
  if (row?.status !== "pending") return undefined;
  const approved = answer.decision === "allow" || answer.decision === "always";
  sql.exec("UPDATE person_ask SET status = ? WHERE request_id = ?", approved ? "allowed" : "denied", link.request_id);
  sql.exec(
    "UPDATE inbox_item SET answer = ? WHERE answer IS NULL AND id IN (SELECT item_id FROM person_ask_item WHERE request_id = ?)",
    JSON.stringify(answer),
    link.request_id,
  );
  return {
    approved,
    request: {
      requestId: link.request_id,
      managerId: row.manager_id,
      actionId: row.action,
      input: JSON.parse(row.input) as Readonly<Record<string, unknown>>,
      by: { id: row.by_id, name: row.by_name },
      preset: row.preset === "owner" || row.preset === "builder" ? row.preset : "member",
      sentence: row.sentence,
    },
  };
}
