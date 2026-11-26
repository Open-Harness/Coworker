import type { Installation, Installations } from "~/modules/github/types.ts";
import type { WorkspaceApi } from "~/modules/workspace/types.ts";
import type { ConnectGitHubResult, TenantObjects, WorkspacesDependencies } from "../types.ts";
import { findRow, ownersOf } from "./directory.ts";

/*
 * An installation belongs to the one workspace that claimed it. Webhooks carry only the installation id, so this
 * table is how a delivery finds its workspace.
 */

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

async function claimed(database: D1Database, installation: number): Promise<string | undefined> {
  const row = await database
    .prepare(`SELECT "workspaceId" FROM "github_installation" WHERE "installationId" = ?`)
    .bind(installation)
    .first<{ workspaceId: string }>();
  return row?.workspaceId;
}

/** Owners only. The caller has asked GitHub that the person may give the installation, and what it reaches. */
export async function connectGitHub(
  { auth, database, objects, clock }: WorkspacesDependencies,
  userId: string,
  workspaceId: string,
  installation: Installation,
): Promise<ConnectGitHubResult> {
  const role = await auth.role(userId, workspaceId);
  if (role === undefined) return { _tag: "NotMember" };
  if (role !== "owner") return { _tag: "NotOwner" };
  const holder = await claimed(database, installation.id);
  if (holder !== undefined && holder !== workspaceId) return { _tag: "Taken" };
  const row = await findRow(database, workspaceId);
  if (row === undefined) return { _tag: "NotMember" };
  try {
    await database.batch([
      database.prepare(`DELETE FROM "github_installation" WHERE "workspaceId" = ?`).bind(workspaceId),
      database
        .prepare(`INSERT INTO "github_installation" ("installationId", "workspaceId", "account", "createdAt") VALUES (?, ?, ?, ?)`)
        .bind(installation.id, workspaceId, installation.account, clock.now()),
    ]);
    return { _tag: "Connected", connection: await objects.get(row.objectId, row.region).connectGitHub(installation) };
  } catch (error) {
    return { _tag: "Failed", message: message(error) };
  }
}

/** For the GitHub Source, not people: the workspace a delivery is for, and what an uninstall does to it. */
export const gitHubInstallations = (database: D1Database, objects: TenantObjects): Installations => ({
  hubOf: async (installation) => {
    const workspaceId = await claimed(database, installation);
    const row = workspaceId === undefined ? undefined : await findRow(database, workspaceId);
    return row === undefined ? undefined : objects.get(row.objectId, row.region);
  },
  removed: async (installation) => {
    const workspaceId = await claimed(database, installation);
    const row = workspaceId === undefined ? undefined : await findRow(database, workspaceId);
    if (workspaceId === undefined || row === undefined) return;
    await objects.get(row.objectId, row.region).gitHubRemoved(installation, await ownersOf(database, workspaceId));
    await database.prepare(`DELETE FROM "github_installation" WHERE "installationId" = ?`).bind(installation).run();
  },
});

/** The object of the workspace that claimed an installation: where what its repos say goes. */
export const installedObject =
  (database: D1Database, objects: TenantObjects) =>
  async (installation: number): Promise<WorkspaceApi | undefined> => {
    const workspaceId = await claimed(database, installation);
    const row = workspaceId === undefined ? undefined : await findRow(database, workspaceId);
    return row === undefined ? undefined : objects.get(row.objectId, row.region);
  };
