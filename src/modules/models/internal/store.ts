import type { Check, ModelConnection, ModelPrice, ModelSource } from "../types.ts";

/** The connections table in the Workspace object. Made on first use, so a destroyed object starts with none. */
export function ensureTable(sql: SqlStorage): void {
  sql.exec(`CREATE TABLE IF NOT EXISTS model_connection (
    id TEXT PRIMARY KEY NOT NULL, source TEXT NOT NULL, label TEXT NOT NULL, base_url TEXT NOT NULL,
    models TEXT NOT NULL, check_tag TEXT NOT NULL, checked_at INTEGER NOT NULL, error TEXT,
    expires_at INTEGER, created_at INTEGER NOT NULL)`);
  const columns = sql.exec<{ name: string }>("SELECT name FROM pragma_table_info('model_connection')").toArray();
  if (!columns.some(({ name }) => name === "prices")) sql.exec("ALTER TABLE model_connection ADD COLUMN prices TEXT");
}

const SOURCES: readonly ModelSource[] = ["anthropic", "openai", "google", "opencode", "endpoint", "chatgpt"];
const asSource = (value: unknown): ModelSource => SOURCES.find((source) => source === value) ?? "endpoint";
const asModels = (value: unknown): readonly string[] => {
  const parsed: unknown = JSON.parse(String(value));
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
};

function asPrices(value: unknown): Readonly<Record<string, ModelPrice>> | undefined {
  if (typeof value !== "string") return undefined;
  const parsed: unknown = JSON.parse(value);
  return typeof parsed === "object" && parsed !== null ? (parsed as Readonly<Record<string, ModelPrice>>) : undefined;
}

function toConnection(row: Record<string, SqlStorageValue>): ModelConnection {
  const checkedAt = Number(row["checked_at"]);
  const check: Check =
    row["check_tag"] === "Works" ? { _tag: "Works", checkedAt } : { _tag: "Failed", checkedAt, error: String(row["error"]) };
  const expires = row["expires_at"];
  const prices = asPrices(row["prices"]);
  return {
    id: String(row["id"]),
    source: asSource(row["source"]),
    label: String(row["label"]),
    baseUrl: String(row["base_url"]),
    models: asModels(row["models"]),
    ...(prices === undefined ? {} : { prices }),
    check,
    ...(typeof expires === "number" ? { expiresAt: expires } : {}),
  };
}

export const listConnections = (sql: SqlStorage): readonly ModelConnection[] =>
  sql.exec("SELECT * FROM model_connection ORDER BY created_at, id").toArray().map(toConnection);

export function findConnection(sql: SqlStorage, id: string): ModelConnection | undefined {
  const row = sql.exec("SELECT * FROM model_connection WHERE id = ?", id).toArray()[0];
  return row === undefined ? undefined : toConnection(row);
}

export function saveConnection(sql: SqlStorage, connection: ModelConnection, createdAt: number): void {
  const { check } = connection;
  sql.exec(
    `INSERT INTO model_connection (id, source, label, base_url, models, check_tag, checked_at, error, expires_at, created_at, prices)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET label = excluded.label, base_url = excluded.base_url, models = excluded.models,
       check_tag = excluded.check_tag, checked_at = excluded.checked_at, error = excluded.error, expires_at = excluded.expires_at,
       prices = excluded.prices`,
    connection.id,
    connection.source,
    connection.label,
    connection.baseUrl,
    JSON.stringify(connection.models),
    check._tag,
    check.checkedAt,
    check._tag === "Failed" ? check.error : null,
    connection.expiresAt ?? null,
    createdAt,
    connection.prices === undefined ? null : JSON.stringify(connection.prices),
  );
}

export const deleteConnection = (sql: SqlStorage, id: string): boolean =>
  sql.exec("DELETE FROM model_connection WHERE id = ?", id).rowsWritten > 0;
