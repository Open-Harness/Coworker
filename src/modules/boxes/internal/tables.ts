import type { BoxState } from "../types.ts";

/** What a box keeps in its manager's own storage: where each work's container is, and what each call of it answered. */
export const BOXES_MIGRATIONS: readonly string[] = [
  `CREATE TABLE box (work TEXT PRIMARY KEY, state TEXT NOT NULL, seconds REAL NOT NULL, snapshot TEXT, bundle TEXT, last_used INTEGER NOT NULL)`,
  `CREATE TABLE box_call (call TEXT PRIMARY KEY, work TEXT NOT NULL, result TEXT NOT NULL)`,
];

const NONE: BoxState = { state: "none", seconds: 0, snapshot: null, bundle: null, lastUsed: 0 };
const STATES: readonly BoxState["state"][] = ["none", "warm", "saved", "gone"];

const textOf = (value: SqlStorageValue | undefined): string | null => (typeof value === "string" ? value : null);

export function readBox(sql: SqlStorage, work: string): BoxState {
  const row = sql.exec("SELECT * FROM box WHERE work = ?", work).toArray()[0];
  if (row === undefined) return NONE;
  return {
    state: STATES.find((state) => state === row["state"]) ?? "none",
    seconds: Number(row["seconds"]),
    snapshot: textOf(row["snapshot"]),
    bundle: textOf(row["bundle"]),
    lastUsed: Number(row["last_used"]),
  };
}

export function writeBox(sql: SqlStorage, work: string, next: Partial<BoxState>, now: number): void {
  const was = readBox(sql, work);
  const box = { ...was, ...next, lastUsed: now };
  sql.exec(
    `INSERT INTO box (work, state, seconds, snapshot, bundle, last_used) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (work) DO UPDATE SET state = excluded.state, seconds = excluded.seconds, snapshot = excluded.snapshot,
       bundle = excluded.bundle, last_used = excluded.last_used`,
    work,
    box.state,
    box.seconds,
    box.snapshot,
    box.bundle,
    box.lastUsed,
  );
}

export const answerOf = (sql: SqlStorage, call: string): string | undefined => {
  const row = sql.exec("SELECT result FROM box_call WHERE call = ?", call).toArray()[0];
  return typeof row?.["result"] === "string" ? row["result"] : undefined;
};

export const keepAnswer = (sql: SqlStorage, work: string, call: string, result: string): void =>
  void sql.exec("INSERT OR IGNORE INTO box_call (call, work, result) VALUES (?, ?, ?)", call, work, result);

export const forgetCalls = (sql: SqlStorage, work: string): void => void sql.exec("DELETE FROM box_call WHERE work = ?", work);
