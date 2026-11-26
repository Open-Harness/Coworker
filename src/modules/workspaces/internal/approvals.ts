import type { ApprovalRequest } from "~/modules/actions/types.ts";
import type { ApprovalOutcome, WorkspacesDependencies } from "../types.ts";
import { ownersOf } from "./directory.ts";
import { reachWorkspace } from "./members.ts";

/**
 * A member pressed a button their own setting says to ask about: it goes to the other Owners' Inboxes, or to the
 * Owner themselves when there is no other, so a workspace of one is never stuck.
 */
export async function approvalFor(
  dependencies: WorkspacesDependencies,
  userId: string,
  workspaceId: string,
  call: ApprovalRequest,
): Promise<ApprovalOutcome> {
  const reached = await reachWorkspace(dependencies, userId, workspaceId, "member");
  if (reached._tag !== "Reached") return { _tag: "NotMember" };
  try {
    const owners = await ownersOf(dependencies.database, workspaceId);
    const others = owners.filter((owner) => owner !== call.by.id);
    const asked = await reached.object.requestApproval(call, others.length === 0 ? owners : others);
    return asked._tag === "NotProvisioned" ? { _tag: "NotMember" } : asked;
  } catch (error) {
    return { _tag: "Failed", message: error instanceof Error ? error.message : String(error) };
  }
}
