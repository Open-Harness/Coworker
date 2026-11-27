import { Blueprint } from "orthograph";
import { Trigger } from "./thing.ts";

export const TriggerAdded = Blueprint.event({ trigger: Trigger.fields.id, manager: Trigger.fields.manager });
export const TriggerOff = Blueprint.event({ trigger: Trigger.fields.id });
export const TriggerOn = Blueprint.event({ trigger: Trigger.fields.id });
