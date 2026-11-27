import { Blueprint } from "orthograph";
import { Join } from "./thing.ts";

export const JoinAsked = Blueprint.event({ join: Join.fields.id, workspace: Join.fields.workspace, person: Join.fields.person });
export const JoinLetIn = Blueprint.event({ join: Join.fields.id });
export const JoinRefused = Blueprint.event({ join: Join.fields.id });
