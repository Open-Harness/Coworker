import { Blueprint } from "orthograph";
import { Manager } from "./thing.ts";

export const ManagerMade = Blueprint.event({ manager: Manager.fields.id, name: Manager.fields.name });
export const ManagerPaused = Blueprint.event({ manager: Manager.fields.id });
export const ManagerStarted = Blueprint.event({ manager: Manager.fields.id });
export const ManagerRetired = Blueprint.event({ manager: Manager.fields.id, handTo: Manager.fields.above });
