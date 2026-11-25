import type { CommandOutcome, DirectoryEvent, WorkspaceRow } from "~/modules/protocol/types.ts";
import type { WorkspacePort } from "~/modules/chat-host/types.ts";
import type { Store } from "./store.ts";

const refused = (code: "unavailable" | "rejected" | "not_found", message: string): CommandOutcome => ({
  ok: false,
  error: { code, message },
});
const done: CommandOutcome = { ok: true, output: { kind: "done" } };

export interface Changed {
  readonly outcome: CommandOutcome;
  readonly shown?: WorkspaceRow;
  readonly removed?: string;
  /** Anything else everyone should see. */
  readonly events?: readonly DirectoryEvent[];
  /** Something is left to finish later. */
  readonly unfinished?: true;
}

/** Records the workspace first and provisions it second, so a crash in between is finished by `reconcile`. */
export async function createWorkspace(
  store: Store,
  workspaces: WorkspacePort,
  request: { readonly id: string; readonly name: string; readonly createdBy: string },
  now: number,
): Promise<Changed> {
  store.insert(request.id, request.name.trim(), request.createdBy, now);
  const found = store.find(request.id);
  if (found === undefined || found.phase === "deleting" || found.phase === "deleted") {
    return { outcome: refused("rejected", "That workspace was deleted") };
  }
  if (found.phase === "active") return { outcome: done, shown: found.row };
  const provisioned = await workspaces.provision({ workspaceId: request.id, name: found.row.name });
  if (!provisioned.ok) {
    return { outcome: refused("unavailable", "The workspace could not be created yet. Try again"), unfinished: true };
  }
  store.setPhase(request.id, "active");
  return { outcome: done, shown: found.row };
}

/** Hides the workspace at once. Its data goes now, or later when it does not answer. */
export async function deleteWorkspace(store: Store, workspaces: WorkspacePort, id: string): Promise<Changed> {
  const found = store.find(id);
  if (found === undefined) return { outcome: refused("not_found", "That workspace does not exist") };
  if (found.phase === "deleted") return { outcome: done, removed: id };
  store.setPhase(id, "deleting");
  const destroyed = await workspaces.destroy(id);
  if (!destroyed.ok) return { outcome: done, removed: id, unfinished: true };
  store.setPhase(id, "deleted");
  return { outcome: done, removed: id };
}

/** Finishes what a crash or an unanswered request left. Returns the workspaces that became visible, and what is left. */
export async function reconcile(
  store: Store,
  workspaces: WorkspacePort,
): Promise<{ readonly shown: readonly WorkspaceRow[]; readonly left: number }> {
  const shown: WorkspaceRow[] = [];
  for (const { id, name, phase } of store.unfinished()) {
    if (phase === "deleting") {
      if ((await workspaces.destroy(id)).ok) store.setPhase(id, "deleted");
      continue;
    }
    if (!(await workspaces.provision({ workspaceId: id, name })).ok) continue;
    store.setPhase(id, "active");
    const row = store.find(id)?.row;
    if (row !== undefined) shown.push(row);
  }
  return { shown, left: store.unfinished().length };
}
