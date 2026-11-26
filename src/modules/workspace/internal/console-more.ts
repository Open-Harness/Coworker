import type { ChatRow, ActivityRow, ManagerRow, MoreAnswer, MoreOp } from "~/modules/console/types.ts";
import type { Decision } from "~/modules/intake/types.ts";

/* What else the console keeps in the workspace's object: managers as they change, what a person did to a piece of work, chats. */

export const MORE_MIGRATIONS: readonly string[] = [
  `CREATE TABLE console_activity (id INTEGER PRIMARY KEY AUTOINCREMENT, manager TEXT NOT NULL, work TEXT NOT NULL, who TEXT NOT NULL, at INTEGER NOT NULL, text TEXT NOT NULL)`,
  `CREATE TABLE console_chat (id TEXT PRIMARY KEY, by_person TEXT NOT NULL, at INTEGER NOT NULL, chat TEXT NOT NULL)`,
];

const parsed = <T>(value: SqlStorageValue | undefined): T => JSON.parse(String(value)) as T;

/** Only what was left because every manager that hears it was paused is decided again. */
const leftPaused = (decision: Decision | undefined): boolean => decision?._tag === "Left" && /paused/iu.test(decision.why);

function reopen(sql: SqlStorage, manager: string): void {
  const rows = sql.exec("SELECT id, hears, decision FROM console_item WHERE decision IS NOT NULL").toArray();
  for (const row of rows) {
    if (!parsed<readonly string[]>(row["hears"]).includes(manager) || !leftPaused(parsed<Decision>(row["decision"]))) continue;
    sql.exec("UPDATE console_item SET decision = NULL, retry = NULL WHERE id = ?", String(row["id"]));
  }
}

/** The console's other calls. `changed` is told to the pages by the object, which holds their sockets. */
export function runMore(sql: SqlStorage, now: number, op: MoreOp): MoreAnswer {
  switch (op.op) {
    case "manager.set":
      sql.exec("UPDATE console_manager SET row = ? WHERE id = ?", JSON.stringify(op.row satisfies ManagerRow), op.row.node.id);
      return { op: "manager.set" };
    case "item.reopen":
      reopen(sql, op.manager);
      return { op: "item.reopen" };
    case "activity.add":
      sql.exec(
        "INSERT INTO console_activity (manager, work, who, at, text) VALUES (?, ?, ?, ?, ?)",
        op.row.manager,
        op.row.work,
        op.row.who,
        op.row.at,
        op.row.text,
      );
      return { op: "activity.add" };
    case "activity.list":
      return {
        op: "activity.list",
        rows: sql
          .exec("SELECT manager, work, who, at, text FROM console_activity WHERE work = ? ORDER BY id", op.work)
          .toArray()
          .map((row): ActivityRow => ({
            manager: String(row["manager"]),
            work: String(row["work"]),
            who: String(row["who"]),
            at: Number(row["at"]),
            text: String(row["text"]),
          })),
      };
    case "chat.add":
      sql.exec(
        "INSERT INTO console_chat (id, by_person, at, chat) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET chat = excluded.chat",
        op.chat.id,
        op.chat.by,
        now,
        JSON.stringify(op.chat),
      );
      return { op: "chat.add" };
    case "chat.list":
      return {
        op: "chat.list",
        rows: sql
          .exec("SELECT chat FROM console_chat WHERE by_person = ? ORDER BY at DESC, id", op.by)
          .toArray()
          .map((row) => parsed<ChatRow>(row["chat"])),
      };
    case "changed":
      return { op: "changed" };
  }
}
