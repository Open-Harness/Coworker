import { Blueprint } from "orthograph";
import { Walk } from "./thing.ts";
import { ConnectorId, Words } from "../../values/coworker.ts";

export const WalkStarted = Blueprint.event({ walk: Walk.fields.id, said: Walk.fields.said });
export const WalkAsked = Blueprint.event({ walk: Walk.fields.id });
export const WalkAnswered = Blueprint.event({ walk: Walk.fields.id });
export const WalkConnected = Blueprint.event({ walk: Walk.fields.id, connector: ConnectorId });
export const WalkSkipped = Blueprint.event({ walk: Walk.fields.id, connector: ConnectorId });
export const WalkFound = Blueprint.event({ walk: Walk.fields.id });
export const WalkDisputed = Blueprint.event({ walk: Walk.fields.id, why: Words });
export const WalkDrafted = Blueprint.event({ walk: Walk.fields.id });
export const WalkMade = Blueprint.event({ walk: Walk.fields.id });
export const WalkThrown = Blueprint.event({ walk: Walk.fields.id });
export const WalkCarried = Blueprint.event({ walk: Walk.fields.id });
