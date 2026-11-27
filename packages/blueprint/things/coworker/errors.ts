import { Blueprint } from "orthograph";
import { Cents } from "../../values/coworker.ts";

/** The parts of the spending add up to more than the whole (spec C11). */
export class PartsOverWhole extends Blueprint.error({ whole: Cents, parts: Cents }, { exit: 30 }) {}
/** That history entry can't be undone: it was undone already, or nothing undoes it. */
export class CannotUndo extends Blueprint.error({}, { exit: 31 }) {}
/** The co-worker may never do more than the person it acts for, so a doing that person may not do can't be on (spec C6). */
export class MoreThanPerson extends Blueprint.error({}, { exit: 32 }) {}
