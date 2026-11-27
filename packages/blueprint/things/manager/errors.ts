import { Blueprint } from "orthograph";

/** A manager can't sit under itself, or under one of the managers below it. */
export class AboveItself extends Blueprint.error({}, { exit: 41 }) {}
/** Its open work goes to a manager that is retired, or to itself. */
export class HandToWrong extends Blueprint.error({}, { exit: 42 }) {}
/** A blank of the template has no answer, or the wrong kind of one. */
export class BlankNotFilled extends Blueprint.error({}, { exit: 43 }) {}
/** Its limit per piece of work is above its limit per day. */
export class ManagerLimitWrong extends Blueprint.error({}, { exit: 44 }) {}
