import type { SecretInfo } from "../types.ts";

/** The vault's two tables in the Workspace object. Made on first use, so a destroyed object starts with none. */
export function ensureTables(sql: SqlStorage): void {
  sql.exec(`CREATE TABLE IF NOT EXISTS vault_key (
    only INTEGER PRIMARY KEY CHECK (only = 1), wrapped BLOB NOT NULL, master_key_id TEXT NOT NULL)`);
  sql.exec(`CREATE TABLE IF NOT EXISTS vault_secret (
    name TEXT PRIMARY KEY NOT NULL, sealed BLOB NOT NULL, updated_at INTEGER NOT NULL)`);
}

const bytes = (value: SqlStorageValue): Uint8Array<ArrayBuffer> =>
  value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array();

export interface WrappedKey {
  readonly wrapped: Uint8Array<ArrayBuffer>;
  readonly masterKeyId: string;
}

export function readKey(sql: SqlStorage): WrappedKey | undefined {
  const row = sql.exec("SELECT wrapped, master_key_id FROM vault_key").toArray()[0];
  return row === undefined ? undefined : { wrapped: bytes(row["wrapped"] ?? null), masterKeyId: String(row["master_key_id"]) };
}

export function writeKey(sql: SqlStorage, key: WrappedKey): void {
  sql.exec(
    "INSERT INTO vault_key (only, wrapped, master_key_id) VALUES (1, ?, ?) ON CONFLICT (only) DO UPDATE SET wrapped = excluded.wrapped, master_key_id = excluded.master_key_id",
    key.wrapped.slice().buffer,
    key.masterKeyId,
  );
}

export function readSealed(sql: SqlStorage, name: string): Uint8Array<ArrayBuffer> | undefined {
  const row = sql.exec("SELECT sealed FROM vault_secret WHERE name = ?", name).toArray()[0];
  return row === undefined ? undefined : bytes(row["sealed"] ?? null);
}

export function writeSealed(sql: SqlStorage, name: string, sealed: Uint8Array<ArrayBuffer>, at: number): void {
  sql.exec(
    "INSERT INTO vault_secret (name, sealed, updated_at) VALUES (?, ?, ?) ON CONFLICT (name) DO UPDATE SET sealed = excluded.sealed, updated_at = excluded.updated_at",
    name,
    sealed.slice().buffer,
    at,
  );
}

export function listSecrets(sql: SqlStorage): readonly SecretInfo[] {
  return sql
    .exec("SELECT name, updated_at FROM vault_secret ORDER BY name")
    .toArray()
    .map((row) => ({ name: String(row["name"]), updatedAt: Number(row["updated_at"]) }));
}

export function deleteSecret(sql: SqlStorage, name: string): boolean {
  return sql.exec("DELETE FROM vault_secret WHERE name = ?", name).rowsWritten > 0;
}
