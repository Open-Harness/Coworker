import { Blueprint } from "orthograph";

/** The words say no schedule, event or wait the co-worker can follow. */
export class TriggerNotUnderstood extends Blueprint.error({}, { exit: 56 }) {}
