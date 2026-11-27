import { Blueprint } from "orthograph";
import workspaceStore from "../../stores/workspace.ts";
import { Workspace } from "../workspace/thing.ts";
import { Manager } from "../manager/thing.ts";
import { Line, Name, Part, Words } from "../../values/coworker.ts";

// A comment on a line of a playbook, inside the workspace's object (`views-manager/playbooks.ts:9-22`). The co-worker
// answers it with a change it offers, an answer, or a case for the evals.
export const Comment = Blueprint.thing({
  description: "A comment on one line of a manager's playbook, and what it became.",
  code: "CO",
  lives: workspaceStore,
  fields: {
    id: Blueprint.id("cmt"),
    workspace: Workspace.fields.id,
    manager: Manager.fields.id,
    line: Line,
    part: Part,
    text: Words,
    by: Name,
  },
});
