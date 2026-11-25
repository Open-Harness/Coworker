import type { Need, OpenWorkspaceResult, ReachResult, RemoveWorkspaceResult, WorkspaceEntry, WorkspacesDependencies } from "../types.ts";
import { deleteRow, findRow, namesOf, rowsFor } from "./directory.ts";

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export async function listWorkspaces({ auth, database }: WorkspacesDependencies, userId: string): Promise<readonly WorkspaceEntry[]> {
  const memberships = await auth.organizationsOf(userId);
  const ids = memberships.map((membership) => membership.organizationId);
  const [rows, names] = await Promise.all([rowsFor(database, ids), namesOf(database, ids)]);
  const roles = new Map(memberships.map((membership) => [membership.organizationId, membership.role]));
  return rows.map((row) => ({
    workspaceId: row.workspaceId,
    name: names.get(row.workspaceId) ?? row.address,
    address: row.address,
    region: row.region,
    role: roles.get(row.workspaceId) ?? "member",
  }));
}

/** Membership first; only then is the workspace's own object asked. */
export async function openWorkspace(
  dependencies: WorkspacesDependencies,
  userId: string,
  workspaceId: string,
): Promise<OpenWorkspaceResult> {
  const role = await dependencies.auth.role(userId, workspaceId);
  if (role === undefined) return { _tag: "NotMember" };
  const row = await findRow(dependencies.database, workspaceId);
  if (row === undefined) return { _tag: "NotMember" };
  try {
    const described = await dependencies.objects.get(row.objectId, row.region).describe();
    if (described._tag === "NotProvisioned") return { _tag: "Failed", message: "The workspace has no data" };
    return { _tag: "Opened", profile: described.profile, role };
  } catch (error) {
    return { _tag: "Failed", message: message(error) };
  }
}

export async function removeWorkspace(
  dependencies: WorkspacesDependencies,
  userId: string,
  workspaceId: string,
): Promise<RemoveWorkspaceResult> {
  const { auth, database, objects } = dependencies;
  const role = await auth.role(userId, workspaceId);
  if (role === undefined) return { _tag: "NotMember" };
  if (role !== "owner") return { _tag: "NotOwner" };
  const row = await findRow(database, workspaceId);
  try {
    // The object first: it holds the data key, so once it is gone nothing left behind can be read.
    if (row !== undefined) await objects.get(row.objectId, row.region).destroy();
  } catch (error) {
    return { _tag: "Failed", message: message(error) };
  }
  await deleteRow(database, workspaceId);
  await auth.deleteOrganization(workspaceId);
  return { _tag: "Removed" };
}

export async function reachWorkspace(
  dependencies: WorkspacesDependencies,
  userId: string,
  workspaceId: string,
  need: Need,
): Promise<ReachResult> {
  const role = await dependencies.auth.role(userId, workspaceId);
  if (role === undefined) return { _tag: "NotMember" };
  if (need === "settings" && role !== "owner") return { _tag: "NotOwner" };
  const row = await findRow(dependencies.database, workspaceId);
  if (row === undefined) return { _tag: "NotMember" };
  return { _tag: "Reached", object: dependencies.objects.get(row.objectId, row.region), role };
}
