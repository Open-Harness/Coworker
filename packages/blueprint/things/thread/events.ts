import { Blueprint } from "orthograph";
import { Thread } from "./thing.ts";
import { Words } from "../../values/coworker.ts";

export const ThreadStarted = Blueprint.event({ thread: Thread.fields.id, work: Thread.fields.work, role: Thread.fields.role });
export const ThreadWaits = Blueprint.event({ thread: Thread.fields.id, for: Words });
export const ThreadWoke = Blueprint.event({ thread: Thread.fields.id });
export const ThreadReported = Blueprint.event({ thread: Thread.fields.id, report: Thread.fields.report });
export const ThreadUnanswered = Blueprint.event({ thread: Thread.fields.id });
export const ThreadStopped = Blueprint.event({ thread: Thread.fields.id });
export const ThreadOver = Blueprint.event({ thread: Thread.fields.id, cost: Thread.fields.cost });
