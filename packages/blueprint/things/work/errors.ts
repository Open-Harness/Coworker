import { Blueprint } from "orthograph";
import { Kind, Step } from "../../values/coworker.ts";

/** That step is not one of this kind's steps in the playbook (spec W4). */
export class StepNotInKind extends Blueprint.error({ step: Step }, { exit: 61 }) {}
/** The manager's playbook has no such kind of work. */
export class KindNotInPlaybook extends Blueprint.error({ kind: Kind }, { exit: 62 }) {}
/** The work it goes before is not on the same manager's board. */
export class NotOnBoard extends Blueprint.error({}, { exit: 63 }) {}
/** The one who answers for work must be a person of the workspace. */
export class NotInWorkspace extends Blueprint.error({}, { exit: 64 }) {}
/** Work goes over to a manager that is retired, or to its own. */
export class HandOverWrong extends Blueprint.error({}, { exit: 65 }) {}
