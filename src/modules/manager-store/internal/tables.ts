import { BOXES_MIGRATIONS } from "~/modules/boxes/service.ts";
import type { Files, Version } from "~/modules/playbook/types.ts";
import type { ManagerRecord } from "../types.ts";
import { WORK_MIGRATIONS } from "./work-tables.ts";

/** The object's own tables. Each statement runs once, in order, and new ones are added to the end. */
const MIGRATIONS: readonly string[] = [
  `CREATE TABLE manager (only INTEGER PRIMARY KEY CHECK (only = 1), id TEXT NOT NULL, workspace TEXT NOT NULL, name TEXT NOT NULL,
     template_id TEXT, template_version INTEGER, by TEXT NOT NULL, at INTEGER NOT NULL)`,
  `CREATE TABLE version (number INTEGER PRIMARY KEY, files TEXT NOT NULL, by TEXT NOT NULL, at INTEGER NOT NULL, says TEXT NOT NULL, origin TEXT NOT NULL)`,
  ...WORK_MIGRATIONS,
  ...BOXES_MIGRATIONS,
];

export function migrate(sql: SqlStorage): void {
  sql.exec("CREATE TABLE IF NOT EXISTS schema_version (only INTEGER PRIMARY KEY CHECK (only = 1), version INTEGER NOT NULL)");
  const done = sql.exec<{ version: number }>("SELECT version FROM schema_version").toArray()[0]?.version ?? 0;
  for (const [index, statement] of MIGRATIONS.entries()) if (index >= done) sql.exec(statement);
  sql.exec(
    "INSERT INTO schema_version (only, version) VALUES (1, ?) ON CONFLICT (only) DO UPDATE SET version = excluded.version",
    MIGRATIONS.length,
  );
}

export function readRecord(sql: SqlStorage): ManagerRecord | undefined {
  const row = sql.exec("SELECT * FROM manager").toArray()[0];
  if (row === undefined) return undefined;
  const template = typeof row["template_id"] === "string" ? { id: row["template_id"], version: Number(row["template_version"]) } : null;
  return {
    id: String(row["id"]),
    workspace: String(row["workspace"]),
    name: String(row["name"]),
    template,
    by: String(row["by"]),
    at: Number(row["at"]),
  };
}

export function writeRecord(sql: SqlStorage, record: ManagerRecord): void {
  sql.exec(
    "INSERT INTO manager (only, id, workspace, name, template_id, template_version, by, at) VALUES (1, ?, ?, ?, ?, ?, ?, ?)",
    record.id,
    record.workspace,
    record.name,
    record.template?.id ?? null,
    record.template?.version ?? null,
    record.by,
    record.at,
  );
}

const ORIGINS: readonly Version["from"][] = ["made", "edited", "suggestion", "went back"];

const versionOf = (row: Record<string, SqlStorageValue>): Version => ({
  number: Number(row["number"]),
  files: JSON.parse(String(row["files"])) as Files,
  by: String(row["by"]),
  at: Number(row["at"]),
  says: String(row["says"]),
  from: ORIGINS.find((origin) => origin === row["origin"]) ?? "made",
});

export const versionsOf = (sql: SqlStorage): readonly Version[] =>
  sql.exec("SELECT * FROM version ORDER BY number DESC").toArray().map(versionOf);

export function versionAt(sql: SqlStorage, number?: number): Version | undefined {
  const rows =
    number === undefined
      ? sql.exec("SELECT * FROM version ORDER BY number DESC LIMIT 1")
      : sql.exec("SELECT * FROM version WHERE number = ?", number);
  const row = rows.toArray()[0];
  return row === undefined ? undefined : versionOf(row);
}

/** Puts a version on top, in one statement, so two saves never take the same number. */
export function pushVersion(sql: SqlStorage, input: Omit<Version, "number">): Version {
  sql.exec(
    "INSERT INTO version (number, files, by, at, says, origin) VALUES ((SELECT COALESCE(MAX(number), 0) + 1 FROM version), ?, ?, ?, ?, ?)",
    JSON.stringify(input.files),
    input.by,
    input.at,
    input.says,
    input.from,
  );
  const saved = versionAt(sql);
  if (saved === undefined) throw new Error("A version was just saved and is not there");
  return saved;
}
