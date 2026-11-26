import type { LinkedAccount, PersonChange } from "~/modules/auth/types.ts";
import { personOf } from "~/modules/protocol/service.ts";
import type { Handle } from "~/modules/triggers/types.ts";
import type { AddHandleOutcome, WorkspacesDependencies } from "../types.ts";
import { findRow, memberCount } from "./directory.ts";
import { reachWorkspace } from "./members.ts";

/*
 * A person's sign-in accounts are their `signed_in` Handles (model.md "Where data lives"). Better Auth keeps the
 * accounts; each workspace they belong to keeps a copy as Handles, so its Gate can match a Trigger without D1.
 */

/** The sources a sign-in account is a Handle on. Google signs people in but is no Source. */
const handleOf = ({ providerId, accountId }: LinkedAccount): Handle | undefined =>
  providerId === "github" ? { kind: "github", id: accountId, proof: "signed_in" } : undefined;

async function give(dependencies: WorkspacesDependencies, userId: string, workspaceIds: readonly string[], handles: readonly Handle[]) {
  const user = await dependencies.auth.userOf(userId);
  if (user === undefined || handles.length === 0) return;
  const person = personOf(user).id;
  for (const workspaceId of workspaceIds) {
    const row = await findRow(dependencies.database, workspaceId);
    if (row === undefined) continue;
    const object = dependencies.objects.get(row.objectId, row.region);
    for (const handle of handles) await object.addHandle(person, handle);
  }
}

/** A seat per member: the workspace's billing hears how many there are now. */
async function seatsFollow(dependencies: WorkspacesDependencies, workspaceId: string): Promise<void> {
  const row = await findRow(dependencies.database, workspaceId);
  if (row === undefined) return;
  await dependencies.objects.get(row.objectId, row.region).membersChanged(await memberCount(dependencies.database, workspaceId));
}

/** Copies a person's accounts into the workspaces they are in: all of them when they link one, one when they join. */
export async function personChanged(dependencies: WorkspacesDependencies, change: PersonChange): Promise<void> {
  if (change.kind !== "linked") await seatsFollow(dependencies, change.organizationId);
  if (change.kind === "left") return;
  const handles = (await dependencies.auth.accounts(change.userId)).flatMap((account) => handleOf(account) ?? []);
  const workspaceIds =
    change.kind === "joined"
      ? [change.organizationId]
      : (await dependencies.auth.organizationsOf(change.userId)).map(({ organizationId }) => organizationId);
  await give(dependencies, change.userId, workspaceIds, handles);
}

/** Another address the person proved is theirs, in every workspace they are in. */
export async function linkEmail(dependencies: WorkspacesDependencies, userId: string, email: string): Promise<void> {
  const workspaceIds = (await dependencies.auth.organizationsOf(userId)).map(({ organizationId }) => organizationId);
  await give(dependencies, userId, workspaceIds, [{ kind: "email", id: email.toLowerCase(), proof: "signed_in" }]);
}

export async function addHandle(
  dependencies: WorkspacesDependencies,
  userId: string,
  workspaceId: string,
  person: string,
  handle: Handle,
): Promise<AddHandleOutcome> {
  const reached = await reachWorkspace(dependencies, userId, workspaceId, "settings");
  return reached._tag === "Reached" ? reached.object.addHandle(person, { ...handle, proof: "added" }) : reached;
}
