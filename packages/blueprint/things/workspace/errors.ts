import { Blueprint } from "orthograph";
import { Address } from "../../values/coworker.ts";

/** Another workspace has that address. */
export class AddressTaken extends Blueprint.error({ address: Address }, { exit: 21 }) {}
/** Deleting it asks for its name, typed, and that was not it (spec L4). */
export class NameNotTyped extends Blueprint.error({}, { exit: 22 }) {}
/** The last Owner cannot stop being one, or leave. */
export class SoleOwner extends Blueprint.error({}, { exit: 23 }) {}
/** A limit was less than nothing, or the warning was above the limit. */
export class LimitWrong extends Blueprint.error({}, { exit: 24 }) {}
