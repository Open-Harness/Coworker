import type { InviteView, Preset } from "../types.ts";

interface Row {
  readonly email: string;
  readonly role: string | null;
  readonly status: string;
  readonly expiresAt: string;
  readonly organizationId: string;
  readonly workspaceName: string;
  readonly slug: string;
  readonly inviterName: string;
  readonly inviterEmail: string;
}

const asPreset = (role: string | null): Preset => (role === "owner" || role === "builder" ? role : "member");

function statusOf({ status, expiresAt }: Row, now: number): InviteView["status"] {
  if (status === "accepted") return "used";
  if (status !== "pending") return "withdrawn";
  return new Date(expiresAt).getTime() <= now ? "expired" : "open";
}

/** An invitation as whoever holds its emailed link may see it. Better Auth's own read is only for the invited address. */
export async function invitationView(database: D1Database, id: string, now: number): Promise<InviteView | undefined> {
  const row = await database
    .prepare(
      `SELECT i."email", i."role", i."status", i."expiresAt", i."organizationId", o."name" AS "workspaceName", o."slug",
         u."name" AS "inviterName", u."email" AS "inviterEmail"
       FROM "invitation" i JOIN "organization" o ON o."id" = i."organizationId" JOIN "user" u ON u."id" = i."inviterId"
       WHERE i."id" = ?`,
    )
    .bind(id)
    .first<Row>();
  if (row === null) return undefined;
  return {
    status: statusOf(row, now),
    email: row.email.toLowerCase(),
    role: asPreset(row.role),
    workspaceId: row.organizationId,
    workspaceName: row.workspaceName,
    address: row.slug,
    invitedBy: row.inviterName.trim() === "" ? row.inviterEmail : row.inviterName,
  };
}
