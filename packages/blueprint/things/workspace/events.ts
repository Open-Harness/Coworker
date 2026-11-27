import { Blueprint } from "orthograph";
import { Workspace } from "./thing.ts";
import { At, Words } from "../../values/coworker.ts";

export const WorkspaceMade = Blueprint.event({ workspace: Workspace.fields.id, name: Workspace.fields.name });
export const WorkspaceChanged = Blueprint.event({ workspace: Workspace.fields.id, says: Words });
export const WorkspaceDeleting = Blueprint.event({ workspace: Workspace.fields.id, goneAt: At });
export const WorkspaceTakenBack = Blueprint.event({ workspace: Workspace.fields.id });
