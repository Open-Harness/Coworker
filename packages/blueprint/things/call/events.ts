import { Blueprint } from "orthograph";
import { Call } from "./thing.ts";

export const CallMade = Blueprint.event({ call: Call.fields.id, action: Call.fields.action, permission: Call.fields.permission });
export const CallApproved = Blueprint.event({ call: Call.fields.id });
export const CallRefused = Blueprint.event({ call: Call.fields.id });
export const CallEnded = Blueprint.event({ call: Call.fields.id, says: Call.fields.says });
