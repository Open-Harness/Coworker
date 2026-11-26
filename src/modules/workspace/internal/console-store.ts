import type { Did } from "~/modules/api/types.ts";
import type { AuditRow, ItemRow, ManagerRow, StoreAnswer, StoreOp } from "~/modules/console/types.ts";
import type { Decision, Item } from "~/modules/intake/types.ts";

/* What the console keeps in the workspace's object: what each doing did (once per key), the audit log, settings, the tree, what came in. */

export const CONSOLE_MIGRATIONS: readonly string[] = [
  `CREATE TABLE console_did (key TEXT PRIMARY KEY, doing TEXT NOT NULL, at INTEGER NOT NULL, answer TEXT)`,
  `CREATE TABLE console_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, by_name TEXT NOT NULL, by_id TEXT NOT NULL,
     kind TEXT NOT NULL, doing TEXT NOT NULL, grouping TEXT NOT NULL, says TEXT NOT NULL, outcome TEXT NOT NULL, why TEXT,
     permission TEXT NOT NULL, role TEXT NOT NULL)`,
  `CREATE TABLE console_setting (name TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE console_manager (id TEXT PRIMARY KEY, at INTEGER NOT NULL, row TEXT NOT NULL)`,
  `CREATE TABLE console_item (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, same TEXT NOT NULL UNIQUE, at INTEGER NOT NULL,
     hears TEXT NOT NULL, item TEXT NOT NULL, decision TEXT)`,
];

/** What people read and answer later, and the co-worker's own conversations. Added after the others, so that objects already made take only these. */
export const KEPT_MIGRATIONS: readonly string[] = [
  `CREATE TABLE console_kept (kind TEXT NOT NULL, id TEXT NOT NULL, seq INTEGER NOT NULL, json TEXT NOT NULL, PRIMARY KEY (kind, id))`,
  `CREATE TABLE console_message (thread TEXT NOT NULL, n INTEGER NOT NULL, json TEXT NOT NULL, PRIMARY KEY (thread, n))`,
];

/** A press that was begun and never settled is let go of after this long: its object was lost before it could say. */
const STALE = 60_000;

export interface StorePlace {
  readonly sql: SqlStorage;
  readonly now: number;
  readonly id: (prefix: string) => string;
}

const parsed = <T>(value: SqlStorageValue | undefined): T => JSON.parse(String(value)) as T;
const OUTCOMES: readonly AuditRow["outcome"][] = ["done", "refused", "asked", "failed"];
const KINDS: readonly AuditRow["kind"][] = ["person", "coworker", "manager"];
const PERMISSIONS: readonly AuditRow["permission"][] = ["on", "ask", "off"];

function auditRow(row: Record<string, SqlStorageValue>): AuditRow {
  const role = String(row["role"]);
  return {
    id: String(row["id"]),
    at: Number(row["at"]),
    by: String(row["by_name"]),
    byId: String(row["by_id"]),
    kind: KINDS.find((kind) => kind === row["kind"]) ?? "person",
    doing: String(row["doing"]),
    group: String(row["grouping"]),
    says: String(row["says"]),
    outcome: OUTCOMES.find((outcome) => outcome === row["outcome"]) ?? "done",
    why: typeof row["why"] === "string" ? row["why"] : null,
    permission: PERMISSIONS.find((permission) => permission === row["permission"]) ?? "on",
    role: role === "Owner" || role === "Builder" ? role : "Member",
  };
}

function claim({ sql, now }: StorePlace, op: Extract<StoreOp, { op: "claim" }>): StoreAnswer {
  const row = sql.exec("SELECT at, answer FROM console_did WHERE key = ?", op.key).toArray()[0];
  if (row !== undefined && typeof row["answer"] === "string") return { op: "claim", is: "done", did: parsed<Did>(row["answer"]) };
  if (row !== undefined && now - Number(row["at"]) < STALE) return { op: "claim", is: "busy" };
  sql.exec(
    "INSERT INTO console_did (key, doing, at, answer) VALUES (?, ?, ?, NULL) ON CONFLICT (key) DO UPDATE SET at = excluded.at",
    op.key,
    op.doing,
    now,
  );
  return { op: "claim", is: "yours" };
}

function listAudit({ sql }: StorePlace, op: Extract<StoreOp, { op: "audit.list" }>): StoreAnswer {
  const before = op.before === null ? Number.MAX_SAFE_INTEGER : Number(op.before);
  const rows = sql
    .exec(
      `SELECT * FROM console_audit WHERE id < ? AND (? IS NULL OR by_name = ? OR by_id = ?) AND (? IS NULL OR outcome = ?)
       ORDER BY id DESC LIMIT ?`,
      Number.isFinite(before) ? before : Number.MAX_SAFE_INTEGER,
      op.by,
      op.by,
      op.by,
      op.outcome,
      op.outcome,
      op.limit + 1,
    )
    .toArray()
    .map(auditRow);
  const lines = rows.slice(0, op.limit);
  return { op: "audit.list", lines, next: rows.length > op.limit ? (lines.at(-1)?.id ?? null) : null };
}

function keepItem({ sql, now, id }: StorePlace, op: Extract<StoreOp, { op: "item.keep" }>): StoreAnswer {
  const known = sql.exec("SELECT * FROM console_item WHERE same = ?", op.item.same).toArray()[0];
  if (known !== undefined) return { op: "item.keep", row: itemRow(known), isNew: false };
  const item: Item = { ...op.item, id: id("itm"), trigger: op.trigger };
  sql.exec(
    "INSERT INTO console_item (id, same, at, hears, item, decision) VALUES (?, ?, ?, ?, ?, NULL)",
    item.id,
    item.same,
    now,
    JSON.stringify(op.hears),
    JSON.stringify(item),
  );
  return { op: "item.keep", row: { item, hears: op.hears, decision: null }, isNew: true };
}

const itemRow = (row: Record<string, SqlStorageValue>): ItemRow => ({
  item: parsed<Item>(row["item"]),
  hears: parsed<readonly string[]>(row["hears"]),
  decision: typeof row["decision"] === "string" ? parsed<Decision>(row["decision"]) : null,
});

function listItems({ sql }: StorePlace, op: Extract<StoreOp, { op: "item.list" }>): StoreAnswer {
  const before = op.before === null ? Number.MAX_SAFE_INTEGER : Number(op.before);
  const found = sql
    .exec("SELECT * FROM console_item WHERE seq < ? ORDER BY seq DESC", Number.isFinite(before) ? before : Number.MAX_SAFE_INTEGER)
    .toArray()
    .filter(
      (row) =>
        parsed<readonly string[]>(row["hears"]).includes(op.manager) && (op.from === null || parsed<Item>(row["item"]).account === op.from),
    );
  const page = found.slice(0, op.limit);
  return { op: "item.list", rows: page.map(itemRow), next: found.length > op.limit ? String(page.at(-1)?.["seq"] ?? "") : null };
}

/** One call of the console's store. Everything it holds is here and nowhere else. */
export function runStore(place: StorePlace, op: StoreOp): StoreAnswer {
  const { sql, now } = place;
  switch (op.op) {
    case "claim":
      return claim(place, op);
    case "settle":
      sql.exec("UPDATE console_did SET answer = ? WHERE key = ?", JSON.stringify(op.did), op.key);
      return { op: "settle" };
    case "audit.add":
      sql.exec(
        `INSERT INTO console_audit (at, by_name, by_id, kind, doing, grouping, says, outcome, why, permission, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        op.row.at,
        op.row.by,
        op.row.byId,
        op.row.kind,
        op.row.doing,
        op.row.group,
        op.row.says,
        op.row.outcome,
        op.row.why,
        op.row.permission,
        op.row.role,
      );
      return { op: "audit.add" };
    case "audit.list":
      return listAudit(place, op);
    case "setting.get": {
      const row = sql.exec("SELECT value FROM console_setting WHERE name = ?", op.name).toArray()[0];
      return { op: "setting.get", value: row === undefined ? undefined : parsed<unknown>(row["value"]) };
    }
    case "setting.set":
      sql.exec(
        "INSERT INTO console_setting (name, value) VALUES (?, ?) ON CONFLICT (name) DO UPDATE SET value = excluded.value",
        op.name,
        JSON.stringify(op.value ?? null),
      );
      return { op: "setting.set" };
    case "manager.add":
      sql.exec("INSERT INTO console_manager (id, at, row) VALUES (?, ?, ?)", op.row.node.id, now, JSON.stringify(op.row));
      return { op: "manager.add" };
    case "manager.list":
      return {
        op: "manager.list",
        rows: sql
          .exec("SELECT row FROM console_manager ORDER BY at, id")
          .toArray()
          .map((row) => parsed<ManagerRow>(row["row"])),
      };
    case "item.keep":
      return keepItem(place, op);
    case "item.list":
      return listItems(place, op);
    case "kept.put":
      sql.exec(
        `INSERT INTO console_kept (kind, id, seq, json) VALUES (?, ?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM console_kept), ?)
         ON CONFLICT (kind, id) DO UPDATE SET json = excluded.json`,
        op.kind,
        op.id,
        JSON.stringify(op.value),
      );
      return { op: "kept.put" };
    case "kept.list":
      return {
        op: "kept.list",
        values: sql
          .exec("SELECT json FROM console_kept WHERE kind = ? ORDER BY seq", op.kind)
          .toArray()
          .map((row) => parsed<unknown>(row["json"])),
      };
    case "message.list":
      return {
        op: "message.list",
        messages: sql
          .exec("SELECT json FROM console_message WHERE thread = ? ORDER BY n", op.thread)
          .toArray()
          .map((row) => parsed<unknown>(row["json"])),
      };
    case "message.add":
      sql.exec(
        "INSERT INTO console_message (thread, n, json) VALUES (?, (SELECT COALESCE(MAX(n), -1) + 1 FROM console_message WHERE thread = ?), ?)",
        op.thread,
        op.thread,
        JSON.stringify(op.message),
      );
      return { op: "message.add" };
  }
}
