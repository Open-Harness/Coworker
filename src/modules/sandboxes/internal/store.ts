import { SIZES, type BuildStatus, type Environment, type EnvironmentView, type Size } from "../types.ts";

/** Tables in the Workspace object. The Workspace runs them with its own, in order. */
export const SANDBOX_MIGRATIONS: readonly string[] = [
  `CREATE TABLE environment (
     id TEXT PRIMARY KEY, name TEXT NOT NULL, setup TEXT NOT NULL, size TEXT NOT NULL, version INTEGER NOT NULL,
     updated_at INTEGER NOT NULL)`,
  "CREATE TABLE agent_environment (agent TEXT PRIMARY KEY, environment_id TEXT NOT NULL)",
  `CREATE TABLE environment_build (
     environment_id TEXT NOT NULL, version INTEGER NOT NULL, status TEXT NOT NULL, image TEXT, output TEXT,
     PRIMARY KEY (environment_id, version))`,
  `CREATE TABLE sandbox_use (
     id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, seconds REAL NOT NULL, environment_id TEXT NOT NULL,
     manager_id TEXT NOT NULL, run TEXT NOT NULL)`,
];

interface EnvironmentRow extends Record<string, SqlStorageValue> {
  id: string;
  name: string;
  setup: string;
  size: string;
  version: number;
  updated_at: number;
}

const sizeOf = (value: string): Size => SIZES.find((size) => size === value) ?? "2 vCPU · 4 GB";

const fromRow = (row: EnvironmentRow): Environment => ({
  id: row.id,
  name: row.name,
  setup: row.setup,
  size: sizeOf(row.size),
  version: row.version,
  updatedAt: row.updated_at,
});

export function environmentById(sql: SqlStorage, id: string): Environment | undefined {
  const row = sql.exec<EnvironmentRow>("SELECT * FROM environment WHERE id = ?", id).toArray()[0];
  return row === undefined ? undefined : fromRow(row);
}

export function environmentOf(sql: SqlStorage, agent: string): Environment | undefined {
  const row = sql.exec<{ environment_id: string }>("SELECT environment_id FROM agent_environment WHERE agent = ?", agent).toArray()[0];
  return row === undefined ? undefined : environmentById(sql, row.environment_id);
}

export function writeEnvironment(sql: SqlStorage, environment: Environment): void {
  sql.exec(
    `INSERT INTO environment (id, name, setup, size, version, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET name = excluded.name, setup = excluded.setup, size = excluded.size,
       version = excluded.version, updated_at = excluded.updated_at`,
    environment.id,
    environment.name,
    environment.setup,
    environment.size,
    environment.version,
    environment.updatedAt,
  );
}

export function assignAgent(sql: SqlStorage, agent: string, environmentId: string | undefined): void {
  if (environmentId === undefined) sql.exec("DELETE FROM agent_environment WHERE agent = ?", agent);
  else
    sql.exec(
      "INSERT INTO agent_environment (agent, environment_id) VALUES (?, ?) ON CONFLICT (agent) DO UPDATE SET environment_id = excluded.environment_id",
      agent,
      environmentId,
    );
}

export type Build = { readonly status: "Ready"; readonly image: string } | { readonly status: "Failed"; readonly output: string };

export function buildOf(sql: SqlStorage, environment: Environment): Build | undefined {
  const row = sql
    .exec<{ status: string; image: string | null; output: string | null }>(
      "SELECT status, image, output FROM environment_build WHERE environment_id = ? AND version = ?",
      environment.id,
      environment.version,
    )
    .toArray()[0];
  if (row === undefined) return undefined;
  return row.status === "Ready" && row.image !== null
    ? { status: "Ready", image: row.image }
    : { status: "Failed", output: row.output ?? "" };
}

export function writeBuild(sql: SqlStorage, environment: Environment, build: Build): void {
  sql.exec(
    "INSERT OR REPLACE INTO environment_build (environment_id, version, status, image, output) VALUES (?, ?, ?, ?, ?)",
    environment.id,
    environment.version,
    build.status,
    build.status === "Ready" ? build.image : null,
    build.status === "Failed" ? build.output : null,
  );
}

export function recordUse(
  sql: SqlStorage,
  line: { readonly at: number; readonly seconds: number; readonly environment: string; readonly managerId: string; readonly run: string },
): void {
  sql.exec(
    "INSERT INTO sandbox_use (at, seconds, environment_id, manager_id, run) VALUES (?, ?, ?, ?, ?)",
    line.at,
    line.seconds,
    line.environment,
    line.managerId,
    line.run,
  );
}

export const usedSince = (sql: SqlStorage, since: number): number =>
  sql.exec<{ seconds: number | null }>("SELECT SUM(seconds) AS seconds FROM sandbox_use WHERE at >= ?", since).toArray()[0]?.seconds ?? 0;

export function listEnvironments(
  sql: SqlStorage,
  saved: readonly { readonly agent: string; readonly environment: string }[],
): readonly EnvironmentView[] {
  const unsaved = sql
    .exec<{ agent: string; environment: string }>("SELECT agent, environment_id AS environment FROM agent_environment")
    .toArray();
  const agents = [...saved, ...unsaved];
  return sql
    .exec<EnvironmentRow>("SELECT * FROM environment ORDER BY name")
    .toArray()
    .map((row) => {
      const environment = fromRow(row);
      const build = buildOf(sql, environment);
      const status: BuildStatus = build?.status ?? "Not started";
      return {
        ...environment,
        status,
        usedBy: [...new Set(agents.filter((one) => one.environment === environment.id).map(({ agent }) => agent))].sort(),
        output: build?.status === "Failed" ? build.output : undefined,
      };
    });
}
