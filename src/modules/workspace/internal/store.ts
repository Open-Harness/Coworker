import type { WorkspaceProfile } from "../types.ts";
import { GITHUB_LOST_MIGRATIONS, GITHUB_MIGRATIONS } from "./github.ts";
import { REQUEST_MIGRATIONS } from "./requests.ts";
import { PEOPLE_MIGRATIONS } from "./people.ts";
import { EVENT_TRIGGER_MIGRATIONS, HEARING_MIGRATIONS } from "./hearing.ts";
import { RUN_FILES_MIGRATIONS, SANDBOX_MIGRATIONS } from "~/modules/sandboxes/service.ts";
import { BILLING_MIGRATIONS } from "~/modules/billing/service.ts";
import { AGENT_ENVIRONMENT_MIGRATIONS, SETTINGS_MIGRATIONS } from "~/modules/settings/service.ts";
import { NOTICE_MIGRATIONS } from "./notices.ts";
import { ASK_MIGRATIONS } from "./person-asks.ts";
import { CONSOLE_MIGRATIONS } from "./console-store.ts";
import { DECIDING_MIGRATIONS } from "./deciding-host.ts";

/** The object's own tables. Each migration runs once, in order, inside the object's storage. */
const MIGRATIONS: readonly string[] = [
  `CREATE TABLE profile (
     only INTEGER PRIMARY KEY CHECK (only = 1),
     workspace_id TEXT NOT NULL, name TEXT NOT NULL, address TEXT NOT NULL, region TEXT NOT NULL,
     created_by TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, action TEXT NOT NULL, subject TEXT NOT NULL)`,
  `CREATE TABLE join_settings (
     only INTEGER PRIMARY KEY CHECK (only = 1),
     links_on INTEGER NOT NULL, link_secret TEXT, domains TEXT NOT NULL)`,
  `CREATE TABLE manager (
     manager_id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, address TEXT NOT NULL UNIQUE,
     template TEXT NOT NULL, object_id TEXT NOT NULL UNIQUE, created_by TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE action_log (
     key TEXT PRIMARY KEY, manager_id TEXT NOT NULL, at INTEGER NOT NULL, action TEXT NOT NULL, by_kind TEXT NOT NULL,
     by_id TEXT NOT NULL, by_name TEXT NOT NULL, permission TEXT NOT NULL, approved_by TEXT, sentence TEXT NOT NULL,
     outcome TEXT NOT NULL)`,
  `CREATE TABLE inbox_item (
     id TEXT PRIMARY KEY, kind TEXT NOT NULL, to_person TEXT NOT NULL, manager_id TEXT NOT NULL, manager_name TEXT NOT NULL,
     title TEXT NOT NULL, options TEXT NOT NULL, task TEXT, created_at INTEGER NOT NULL, answer TEXT, waiters TEXT NOT NULL)`,
  "ALTER TABLE inbox_item ADD COLUMN detail TEXT",
  ...HEARING_MIGRATIONS,
  ...GITHUB_MIGRATIONS,
  ...REQUEST_MIGRATIONS,
  ...PEOPLE_MIGRATIONS,
  ...SANDBOX_MIGRATIONS,
  ...BILLING_MIGRATIONS,
  ...SETTINGS_MIGRATIONS,
  ...NOTICE_MIGRATIONS,
  ...ASK_MIGRATIONS,
  ...RUN_FILES_MIGRATIONS,
  ...EVENT_TRIGGER_MIGRATIONS,
  ...GITHUB_LOST_MIGRATIONS,
  ...AGENT_ENVIRONMENT_MIGRATIONS,
  ...CONSOLE_MIGRATIONS,
  ...DECIDING_MIGRATIONS,
];

export function migrate(sql: SqlStorage): void {
  sql.exec("CREATE TABLE IF NOT EXISTS schema_version (only INTEGER PRIMARY KEY CHECK (only = 1), version INTEGER NOT NULL)");
  const row = sql.exec<{ version: number }>("SELECT version FROM schema_version").toArray()[0];
  const done = row?.version ?? 0;
  for (const [index, statement] of MIGRATIONS.entries()) if (index >= done) sql.exec(statement);
  sql.exec(
    "INSERT INTO schema_version (only, version) VALUES (1, ?) ON CONFLICT (only) DO UPDATE SET version = excluded.version",
    MIGRATIONS.length,
  );
}

interface ProfileRow extends Record<string, SqlStorageValue> {
  workspace_id: string;
  name: string;
  address: string;
  region: string;
  created_by: string;
  created_at: number;
}

export function readProfile(sql: SqlStorage): WorkspaceProfile | undefined {
  const row = sql.exec<ProfileRow>("SELECT * FROM profile").toArray()[0];
  if (row === undefined) return undefined;
  return {
    workspaceId: row.workspace_id,
    name: row.name,
    address: row.address,
    region: row.region === "us" ? "us" : "eu",
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function writeProfile(sql: SqlStorage, profile: WorkspaceProfile): void {
  sql.exec(
    "INSERT INTO profile (only, workspace_id, name, address, region, created_by, created_at) VALUES (1, ?, ?, ?, ?, ?, ?)",
    profile.workspaceId,
    profile.name,
    profile.address,
    profile.region,
    profile.createdBy,
    profile.createdAt,
  );
}

export function appendAudit(sql: SqlStorage, line: { readonly at: number; readonly action: string; readonly subject: string }): void {
  sql.exec("INSERT INTO audit_log (at, action, subject) VALUES (?, ?, ?)", line.at, line.action, line.subject);
}
