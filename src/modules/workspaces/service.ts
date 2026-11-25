import { createWorkspace } from "./internal/create.ts";
import { connectGitHub } from "./internal/github.ts";
import { answer, requestJoin } from "./internal/requests.ts";
import { addHandle, linkEmail, personChanged } from "./internal/people.ts";
import { findByAddress } from "./internal/directory.ts";
import { approvalFor } from "./internal/approvals.ts";
import { exportData, updateGeneral } from "./internal/general.ts";
import { joinByDomain, joinByLink, joining, setApprovedDomains, setInviteLinks } from "./internal/joining.ts";
import { listWorkspaces, openWorkspace, reachWorkspace, removeWorkspace } from "./internal/members.ts";
import type { TenantObjects, WorkspaceAt, Workspaces, WorkspacesDependencies } from "./types.ts";

export { gitHubInstallations } from "./internal/github.ts";
export { durableTenantObjects, type TenantNamespace } from "./internal/objects.ts";

export const createWorkspaces = (dependencies: WorkspacesDependencies): Workspaces => ({
  create: (input) => createWorkspace(dependencies, input),
  list: (userId) => listWorkspaces(dependencies, userId),
  open: (userId, workspaceId) => openWorkspace(dependencies, userId, workspaceId),
  reach: (userId, workspaceId, need) => reachWorkspace(dependencies, userId, workspaceId, need),
  remove: (userId, workspaceId) => removeWorkspace(dependencies, userId, workspaceId),
  joining: (userId, workspaceId) => joining(dependencies, userId, workspaceId),
  setInviteLinks: (userId, workspaceId, on) => setInviteLinks(dependencies, userId, workspaceId, on),
  setApprovedDomains: (userId, workspaceId, domains) => setApprovedDomains(dependencies, userId, workspaceId, domains),
  joinByLink: (userId, workspaceId, secret) => joinByLink(dependencies, userId, workspaceId, secret),
  joinByDomain: (user) => joinByDomain(dependencies, user),
  personChanged: (change) => personChanged(dependencies, change).catch(() => undefined),
  linkEmail: (userId, email) => linkEmail(dependencies, userId, email),
  addHandle: (userId, workspaceId, person, handle) => addHandle(dependencies, userId, workspaceId, person, handle),
  requestJoin: (person, address) => requestJoin(dependencies, person, address),
  answer: (userId, workspaceId, itemId, given) => answer(dependencies, userId, workspaceId, itemId, given),
  connectGitHub: (userId, workspaceId, installation) => connectGitHub(dependencies, userId, workspaceId, installation),
  approvalFor: (userId, workspaceId, call) => approvalFor(dependencies, userId, workspaceId, call),
  updateGeneral: (userId, workspaceId, input) => updateGeneral(dependencies, userId, workspaceId, input),
  exportData: (userId, workspaceId) => exportData(dependencies, userId, workspaceId),
});

/** Finds a workspace's object by its address, without a person: for mail arriving at it. */
export const workspaceAt =
  (database: D1Database, objects: TenantObjects): WorkspaceAt =>
  async (address) => {
    const row = await findByAddress(database, address);
    return row === undefined ? undefined : objects.get(row.objectId, row.region);
  };
