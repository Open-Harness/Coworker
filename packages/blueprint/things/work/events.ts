import { Blueprint } from "orthograph";
import { Work } from "./thing.ts";

export const WorkAdded = Blueprint.event({ work: Work.fields.id, manager: Work.fields.manager, title: Work.fields.title });
export const WorkWaits = Blueprint.event({ work: Work.fields.id, why: Work.fields.why });
export const WorkWoke = Blueprint.event({ work: Work.fields.id });
export const WorkEnded = Blueprint.event({ work: Work.fields.id, why: Work.fields.why });
export const WorkStopped = Blueprint.event({ work: Work.fields.id, why: Work.fields.why });
export const WorkHandedOver = Blueprint.event({ work: Work.fields.id, to: Work.fields.manager });
export const WorkOpenedAgain = Blueprint.event({ work: Work.fields.id, why: Work.fields.why });
