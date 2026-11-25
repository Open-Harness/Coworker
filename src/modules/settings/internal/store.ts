/** The settings module's tables in the Workspace object. The Workspace runs them with its own, in order. */
export const SETTINGS_MIGRATIONS: readonly string[] = [
  "CREATE TABLE setting (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
  "CREATE TABLE logo (only INTEGER PRIMARY KEY CHECK (only = 1), type TEXT NOT NULL, bytes BLOB NOT NULL, updated_at INTEGER NOT NULL)",
  `CREATE TABLE person_change (
     person TEXT NOT NULL, scope TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, by_id TEXT NOT NULL,
     by_name TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (person, scope, key))`,
  "CREATE TABLE person_setting (person TEXT NOT NULL, kind TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (person, kind))",
  "CREATE TABLE manager_budget (manager_id TEXT PRIMARY KEY, hours REAL NOT NULL, when_reached TEXT NOT NULL)",
  `CREATE TABLE agent (
     id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, created_by TEXT NOT NULL)`,
  `CREATE TABLE agent_version (
     agent_id TEXT NOT NULL, version INTEGER NOT NULL, config TEXT NOT NULL, note TEXT NOT NULL, saved_at INTEGER NOT NULL,
     saved_by TEXT NOT NULL, PRIMARY KEY (agent_id, version))`,
  `CREATE TABLE skill (
     id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, created_by TEXT NOT NULL)`,
  `CREATE TABLE skill_version (
     skill_id TEXT NOT NULL, version INTEGER NOT NULL, files TEXT NOT NULL, note TEXT NOT NULL, saved_at INTEGER NOT NULL,
     saved_by TEXT NOT NULL, PRIMARY KEY (skill_id, version))`,
];

/**
 * An agent's environment was kept by its name, beside it; now it is one of its settings. Every version takes the one its
 * agent had. What is left by name is the plain Worker's. Run after the sandboxes' tables and the ones above.
 */
export const AGENT_ENVIRONMENT_MIGRATIONS: readonly string[] = [
  `UPDATE agent_version SET config = json_set(config, '$.environment', (
     SELECT e.environment_id FROM agent_environment e JOIN agent a ON a.name = e.agent WHERE a.id = agent_version.agent_id))`,
  "DELETE FROM agent_environment WHERE agent <> 'Worker' OR agent IN (SELECT name FROM agent)",
];

export const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A small JSON value kept under a key. */
export function readSetting(sql: SqlStorage, key: string): unknown {
  const row = sql.exec<{ value: string }>("SELECT value FROM setting WHERE key = ?", key).toArray()[0];
  return row === undefined ? undefined : (JSON.parse(row.value) as unknown);
}

export function writeSetting(sql: SqlStorage, key: string, value: unknown): void {
  sql.exec(
    "INSERT INTO setting (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    key,
    JSON.stringify(value),
  );
}

/** One person's value of one kind (profile, notifications). */
export function readPerson(sql: SqlStorage, person: string, kind: string): unknown {
  const row = sql.exec<{ value: string }>("SELECT value FROM person_setting WHERE person = ? AND kind = ?", person, kind).toArray()[0];
  return row === undefined ? undefined : (JSON.parse(row.value) as unknown);
}

export function writePerson(sql: SqlStorage, person: string, kind: string, value: unknown): void {
  sql.exec(
    "INSERT INTO person_setting (person, kind, value) VALUES (?, ?, ?) ON CONFLICT (person, kind) DO UPDATE SET value = excluded.value",
    person,
    kind,
    JSON.stringify(value),
  );
}
