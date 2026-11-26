import type { Answer } from "~/modules/workspace/types.ts";
import type { JoinRequester } from "~/modules/workspace/types.ts";
import type { AnswerOutcome, RequestJoinOutcome, WorkspacesDependencies } from "../types.ts";
import { findByAddress, ownersOf } from "./directory.ts";
import { reachWorkspace } from "./members.ts";

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Someone signed in, not invited and not approved, asks the workspace at `address` to let them in. */
export async function requestJoin(
  { auth, database, objects }: WorkspacesDependencies,
  person: JoinRequester,
  address: string,
): Promise<RequestJoinOutcome> {
  const row = await findByAddress(database, address);
  if (row === undefined) return { _tag: "NoSuchWorkspace" };
  if ((await auth.role(person.userId, row.workspaceId)) !== undefined) return { _tag: "AlreadyMember", workspaceId: row.workspaceId };
  try {
    const asked = await objects.get(row.objectId, row.region).requestJoin(person, await ownersOf(database, row.workspaceId));
    return asked._tag === "NotProvisioned" ? { _tag: "NoSuchWorkspace" } : { ...asked, workspaceId: row.workspaceId };
  } catch (error) {
    return { _tag: "Failed", message: message(error) };
  }
}

/** A member answers an Inbox item. When it lets a request to join in, the requester becomes a Member here. */
export async function answer(
  dependencies: WorkspacesDependencies,
  userId: string,
  workspaceId: string,
  itemId: string,
  given: Answer,
): Promise<AnswerOutcome> {
  const reached = await reachWorkspace(dependencies, userId, workspaceId, "member");
  if (reached._tag !== "Reached") return { _tag: "NotMember" };
  const result = await reached.object.answer(itemId, given);
  if (result._tag !== "Answered" || result.admit === undefined) return result;
  const added = await dependencies.auth.addMember({ userId: result.admit, organizationId: workspaceId, role: "member" });
  return added._tag === "Failed" ? { _tag: "Failed", message: added.message } : result;
}
