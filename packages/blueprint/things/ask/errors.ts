import { Blueprint } from "orthograph";

/** The answer is not one of the ask's options. */
export class NotAnOption extends Blueprint.error({}, { exit: 76 }) {}
/** Only the one it asks answers it. */
export class NotAskedOfYou extends Blueprint.error({}, { exit: 77 }) {}
/** Only an ask that needs a yes is approved. */
export class NotAnApproval extends Blueprint.error({}, { exit: 78 }) {}
