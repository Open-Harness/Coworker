import type { NewUser, Preset } from "~/modules/auth/types.ts";
import type { JoinSettings } from "~/modules/workspace/types.ts";
import type { JoinByLinkResult, JoiningResult, JoiningSettings, SetDomainsOutcome, WorkspacesDependencies } from "../types.ts";
import { findRow } from "./directory.ts";
import { reachWorkspace } from "./members.ts";

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));
/** Everyone who joins without an invite starts as a Member; an emailed invite carries its own preset. */
const JOINS_AS: Preset = "member";

const view = (settings: JoinSettings, workspaceId: string): JoiningSettings => ({
  _tag: "Settings",
  linksOn: settings.linksOn,
  ...(settings.linkSecret === undefined ? {} : { linkPath: `/join/link/${workspaceId}/${settings.linkSecret}` }),
  domains: settings.domains,
});

/** The Owner's view of how people join. Anyone else is told no. */
export async function joining(dependencies: WorkspacesDependencies, userId: string, workspaceId: string): Promise<JoiningResult> {
  const reached = await reachWorkspace(dependencies, userId, workspaceId, "settings");
  if (reached._tag !== "Reached") return reached;
  try {
    const found = await reached.object.joinSettings();
    return found._tag === "Settings" ? view(found.settings, workspaceId) : { _tag: "NotMember" };
  } catch (error) {
    return { _tag: "Failed", message: message(error) };
  }
}

export async function setInviteLinks(
  dependencies: WorkspacesDependencies,
  userId: string,
  workspaceId: string,
  on: boolean,
): Promise<JoiningResult> {
  const reached = await reachWorkspace(dependencies, userId, workspaceId, "settings");
  if (reached._tag !== "Reached") return reached;
  try {
    const found = await reached.object.setInviteLinks(on);
    return found._tag === "Settings" ? view(found.settings, workspaceId) : { _tag: "NotMember" };
  } catch (error) {
    return { _tag: "Failed", message: message(error) };
  }
}

/** The object keeps the list; the organization's metadata keeps a copy so a new account's domain can find it. */
export async function setApprovedDomains(
  dependencies: WorkspacesDependencies,
  userId: string,
  workspaceId: string,
  domains: readonly string[],
): Promise<SetDomainsOutcome> {
  const reached = await reachWorkspace(dependencies, userId, workspaceId, "settings");
  if (reached._tag !== "Reached") return reached;
  try {
    const saved = await reached.object.setApprovedDomains(domains);
    if (saved._tag === "NotProvisioned") return { _tag: "NotMember" };
    if (saved._tag === "InvalidDomain") return saved;
    await dependencies.auth.setApprovedDomains(workspaceId, saved.settings.domains);
    return view(saved.settings, workspaceId);
  } catch (error) {
    return { _tag: "Failed", message: message(error) };
  }
}

/** The link carries the workspace id and a secret; the workspace's own object decides whether the secret is good. */
export async function joinByLink(
  dependencies: WorkspacesDependencies,
  userId: string,
  workspaceId: string,
  secret: string,
): Promise<JoinByLinkResult> {
  const { auth, database, objects } = dependencies;
  const row = await findRow(database, workspaceId);
  if (row === undefined) return { _tag: "LinkInvalid" };
  try {
    if (!(await objects.get(row.objectId, row.region).allowsJoin({ kind: "link", secret }))) return { _tag: "LinkInvalid" };
  } catch (error) {
    return { _tag: "Failed", message: message(error) };
  }
  const added = await auth.addMember({ userId, organizationId: workspaceId, role: JOINS_AS });
  if (added._tag === "Failed") return added;
  return added._tag === "AlreadyMember"
    ? { _tag: "AlreadyMember", workspaceId, role: added.role }
    : { _tag: "Joined", workspaceId, role: JOINS_AS };
}

/**
 * The sign-up hook: every workspace that approves the new account's email domain adds them as a Member. The
 * organization's metadata only suggests candidates; each object confirms. Never throws, since sign-in must go on.
 */
export async function joinByDomain(dependencies: WorkspacesDependencies, user: NewUser): Promise<readonly string[]> {
  const { auth, database, objects } = dependencies;
  const domain = user.email.split("@")[1]?.toLowerCase();
  if (!user.emailVerified || domain === undefined) return [];
  const joined: string[] = [];
  for (const workspaceId of await auth.organizationsApproving(domain).catch(() => [])) {
    const row = await findRow(database, workspaceId);
    if (row === undefined) continue;
    try {
      if (!(await objects.get(row.objectId, row.region).allowsJoin({ kind: "domain", domain }))) continue;
    } catch {
      continue;
    }
    const added = await auth.addMember({ userId: user.userId, organizationId: workspaceId, role: JOINS_AS });
    if (added._tag === "Added") joined.push(workspaceId);
  }
  return joined;
}
