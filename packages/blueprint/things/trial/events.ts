import { Blueprint } from "orthograph";
import { Trial } from "./thing.ts";

export const TrialStarted = Blueprint.event({ trial: Trial.fields.id, manager: Trial.fields.manager });
export const TrialTried = Blueprint.event({ trial: Trial.fields.id, differ: Trial.fields.differ, worse: Trial.fields.worse });
export const TrialDecided = Blueprint.event({ trial: Trial.fields.id });
