import type { LinkedAccount, Preset } from "../types.ts";

/** Reads and removals on Better Auth's own tables that its API has no server-side call for. */
const asPreset = (role: string): Preset => (role === "owner" || role === "builder" ? role : "member");

export async function accountsOf(database: D1Database, userId: string): Promise<readonly LinkedAccount[]> {
  const { results } = await database
    .prepare(`SELECT "providerId", "accountId" FROM "account" WHERE "userId" = ? ORDER BY "createdAt"`)
    .bind(userId)
    .all<{ providerId: string; accountId: string }>();
  return results.map((row) => ({ providerId: row.providerId, accountId: row.accountId }));
}

export async function roleIn(database: D1Database, userId: string, organizationId: string): Promise<Preset | undefined> {
  const row = await database
    .prepare(`SELECT "role" FROM "member" WHERE "userId" = ? AND "organizationId" = ?`)
    .bind(userId, organizationId)
    .first<{ role: string }>();
  return row === null ? undefined : asPreset(row.role);
}

export async function membershipsOf(
  database: D1Database,
  userId: string,
): Promise<readonly { readonly organizationId: string; readonly role: Preset }[]> {
  const { results } = await database
    .prepare(`SELECT "organizationId", "role" FROM "member" WHERE "userId" = ? ORDER BY "createdAt"`)
    .bind(userId)
    .all<{ organizationId: string; role: string }>();
  return results.map((row) => ({ organizationId: row.organizationId, role: asPreset(row.role) }));
}

/** Everyone with a seat in an organization, with the name and sign-in email their person id is made from. */
export async function membersIn(
  database: D1Database,
  organizationId: string,
): Promise<readonly { readonly userId: string; readonly email: string; readonly name: string; readonly role: Preset }[]> {
  const { results } = await database
    .prepare(
      `SELECT m."userId", m."role", u."email", u."name" FROM "member" m JOIN "user" u ON u."id" = m."userId"
       WHERE m."organizationId" = ? ORDER BY m."createdAt", m."userId"`,
    )
    .bind(organizationId)
    .all<{ userId: string; role: string; email: string; name: string }>();
  return results.map((row) => ({ userId: row.userId, email: row.email, name: row.name, role: asPreset(row.role) }));
}

export async function renameOrganization(database: D1Database, organizationId: string, name: string, slug: string): Promise<void> {
  await database.prepare(`UPDATE "organization" SET "name" = ?, "slug" = ? WHERE "id" = ?`).bind(name, slug, organizationId).run();
}

export async function slugTaken(database: D1Database, slug: string): Promise<boolean> {
  return (await database.prepare(`SELECT 1 AS taken FROM "organization" WHERE "slug" = ?`).bind(slug).first()) !== null;
}

export async function removeOrganization(database: D1Database, organizationId: string): Promise<void> {
  await database.batch([
    database.prepare(`DELETE FROM "invitation" WHERE "organizationId" = ?`).bind(organizationId),
    database.prepare(`DELETE FROM "member" WHERE "organizationId" = ?`).bind(organizationId),
    database.prepare(`UPDATE "session" SET "activeOrganizationId" = NULL WHERE "activeOrganizationId" = ?`).bind(organizationId),
    database.prepare(`DELETE FROM "organization" WHERE "id" = ?`).bind(organizationId),
  ]);
}

export async function saveApprovedDomains(database: D1Database, organizationId: string, domains: readonly string[]): Promise<void> {
  await database
    .prepare(
      `UPDATE "organization" SET "metadata" = json_set(CASE WHEN json_valid("metadata") THEN "metadata" ELSE '{}' END, '$.domains', json(?)) WHERE "id" = ?`,
    )
    .bind(JSON.stringify(domains), organizationId)
    .run();
}

export async function approvingDomain(database: D1Database, domain: string): Promise<readonly string[]> {
  const { results } = await database
    .prepare(
      `SELECT "id" FROM "organization" WHERE json_valid("metadata") AND EXISTS (SELECT 1 FROM json_each("metadata", '$.domains') WHERE "value" = ?)`,
    )
    .bind(domain)
    .all<{ id: string }>();
  return results.map((row) => row.id);
}

/** A person's preset in an organization, changed. The person must have a seat. */
export async function setRoleIn(database: D1Database, userId: string, organizationId: string, role: Preset): Promise<boolean> {
  const done = await database
    .prepare(`UPDATE "member" SET "role" = ? WHERE "userId" = ? AND "organizationId" = ?`)
    .bind(role, userId, organizationId)
    .run();
  return (done.meta.changes ?? 0) > 0;
}

/** A person's seat, taken away, and the sessions that had the organization open let go of it. */
export async function removeMemberFrom(database: D1Database, userId: string, organizationId: string): Promise<boolean> {
  const [removed] = await database.batch([
    database.prepare(`DELETE FROM "member" WHERE "userId" = ? AND "organizationId" = ?`).bind(userId, organizationId),
    database
      .prepare(`UPDATE "session" SET "activeOrganizationId" = NULL WHERE "userId" = ? AND "activeOrganizationId" = ?`)
      .bind(userId, organizationId),
  ]);
  return (removed?.meta.changes ?? 0) > 0;
}
