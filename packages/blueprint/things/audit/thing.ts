import { Blueprint } from "orthograph";
import workspaceStore from "../../stores/workspace.ts";
import { Workspace } from "../workspace/thing.ts";
import { At, DoingId, Name, Outcome, Permission, Words } from "../../values/coworker.ts";

// One table in the workspace's object, appended only: everything done in the workspace, by a person or the co-worker, and
// whether it needed a yes. The co-worker's history page reads it too, and `history.undo` names one of its lines.
export const Audit = Blueprint.thing({
  description: "One line of the audit log: when, by whom, what it says, under which permission, who said yes, and how it ended.",
  code: "AU",
  lives: workspaceStore,
  fields: {
    id: Blueprint.id("aud"),
    workspace: Workspace.fields.id,
    at: At,
    by: Name,
    doing: DoingId,
    says: Words,
    permission: Permission,
    under: Name,
    approvedBy: Name,
    outcome: Outcome,
    why: Words,
  },
});
