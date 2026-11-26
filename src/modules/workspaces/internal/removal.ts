import { findRow } from "./directory.ts";
import type { ScheduleResult, WorkspacesDependencies } from "../types.ts";

/* Deleting a workspace is in two times: an Owner says so, and thirty days later everything is destroyed. Until then it is as it was. */

/** Owners only: the workspace is removed for good at `at`. Said again, the date is the one said last. */
export async function scheduleRemoval(
  { auth, database }: WorkspacesDependencies,
  userId: string,
  workspaceId: string,
  at: number,
): Promise<ScheduleResult> {
  const role = await auth.role(userId, workspaceId);
  if (role === undefined || (await findRow(database, workspaceId)) === undefined) return { _tag: "NotMember" };
  if (role !== "owner") return { _tag: "NotOwner" };
  await database.prepare(`UPDATE "workspace_directory" SET "deleteAt" = ? WHERE "workspaceId" = ?`).bind(at, workspaceId).run();
  return { _tag: "Scheduled", at };
}

/** Every workspace whose day has come: its object (and with it the data key and its managers' objects) first, then its rows. Answers how many. */
export async function removeDue({ auth, database, objects }: WorkspacesDependencies, now: number): Promise<number> {
  const { results } = await database
    .prepare(`SELECT "workspaceId", "objectId", "region" FROM "workspace_directory" WHERE "deleteAt" IS NOT NULL AND "deleteAt" <= ?`)
    .bind(now)
    .all<{ workspaceId: string; objectId: string; region: "eu" | "us" }>();
  let removed = 0;
  for (const { workspaceId, objectId, region } of results) {
    try {
      await objects.get(objectId, region).destroy();
      await database.prepare(`DELETE FROM "workspace_directory" WHERE "workspaceId" = ?`).bind(workspaceId).run();
      await auth.deleteOrganization(workspaceId);
      removed += 1;
    } catch {
      // It is tried again at the next sweep: nothing is half removed that a second try does not finish.
    }
  }
  return removed;
}
