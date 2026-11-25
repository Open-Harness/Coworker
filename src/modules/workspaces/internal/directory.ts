import { personOf } from "~/modules/protocol/service.ts";
import type { Region } from "~/modules/workspace/types.ts";

/** One `workspace_directory` row. */
export interface DirectoryRow {
  readonly workspaceId: string;
  readonly objectId: string;
  readonly address: string;
  readonly region: Region;
  readonly createdAt: number;
}

const asRegion = (value: string): Region => (value === "eu" ? "eu" : "us");
const toRow = (row: DirectoryRow): DirectoryRow => ({ ...row, region: asRegion(row.region) });

export async function findRow(database: D1Database, workspaceId: string): Promise<DirectoryRow | undefined> {
  const row = await database.prepare(`SELECT * FROM "workspace_directory" WHERE "workspaceId" = ?`).bind(workspaceId).first<DirectoryRow>();
  return row === null ? undefined : toRow(row);
}

export async function findByAddress(database: D1Database, address: string): Promise<DirectoryRow | undefined> {
  const row = await database
    .prepare(`SELECT * FROM "workspace_directory" WHERE "address" = ?`)
    .bind(address.toLowerCase())
    .first<DirectoryRow>();
  return row === null ? undefined : toRow(row);
}

export async function addressInUse(database: D1Database, address: string): Promise<boolean> {
  return (await database.prepare(`SELECT 1 AS used FROM "workspace_directory" WHERE "address" = ?`).bind(address).first()) !== null;
}

/** False when the address or object was taken meanwhile. */
export async function insertRow(database: D1Database, row: DirectoryRow): Promise<boolean> {
  try {
    await database
      .prepare(`INSERT INTO "workspace_directory" ("workspaceId", "objectId", "address", "region", "createdAt") VALUES (?, ?, ?, ?, ?)`)
      .bind(row.workspaceId, row.objectId, row.address, row.region, row.createdAt)
      .run();
    return true;
  } catch {
    return false;
  }
}

/** False when another workspace holds the address. */
export async function setAddress(database: D1Database, workspaceId: string, address: string): Promise<boolean> {
  try {
    await database.prepare(`UPDATE "workspace_directory" SET "address" = ? WHERE "workspaceId" = ?`).bind(address, workspaceId).run();
    return true;
  } catch {
    return false;
  }
}

export async function deleteRow(database: D1Database, workspaceId: string): Promise<void> {
  await database.prepare(`DELETE FROM "workspace_directory" WHERE "workspaceId" = ?`).bind(workspaceId).run();
}

/** The rows for these organizations, in the order given. */
export async function rowsFor(database: D1Database, workspaceIds: readonly string[]): Promise<readonly DirectoryRow[]> {
  if (workspaceIds.length === 0) return [];
  const marks = workspaceIds.map(() => "?").join(", ");
  const { results } = await database
    .prepare(`SELECT * FROM "workspace_directory" WHERE "workspaceId" IN (${marks})`)
    .bind(...workspaceIds)
    .all<DirectoryRow>();
  const byId = new Map(results.map((row) => [row.workspaceId, toRow(row)]));
  return workspaceIds.flatMap((id) => byId.get(id) ?? []);
}

export async function namesOf(database: D1Database, workspaceIds: readonly string[]): Promise<ReadonlyMap<string, string>> {
  if (workspaceIds.length === 0) return new Map();
  const marks = workspaceIds.map(() => "?").join(", ");
  const { results } = await database
    .prepare(`SELECT "id", "name" FROM "organization" WHERE "id" IN (${marks})`)
    .bind(...workspaceIds)
    .all<{ id: string; name: string }>();
  return new Map(results.map((row) => [row.id, row.name]));
}

/** The person ids of a workspace's Owners, as Inbox items name them. */
export async function memberCount(database: D1Database, workspaceId: string): Promise<number> {
  const row = await database
    .prepare(`SELECT COUNT(*) AS n FROM "member" WHERE "organizationId" = ?`)
    .bind(workspaceId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function ownersOf(database: D1Database, workspaceId: string): Promise<readonly string[]> {
  const { results } = await database
    .prepare(
      `SELECT u."email", u."name" FROM "member" m JOIN "user" u ON u."id" = m."userId" WHERE m."organizationId" = ? AND m."role" = 'owner'`,
    )
    .bind(workspaceId)
    .all<{ email: string; name: string }>();
  return results.map((user) => personOf(user).id);
}
