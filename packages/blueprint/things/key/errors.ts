import { Blueprint } from "orthograph";

/** The provider refused the key when it was tried. */
export class KeyRefused extends Blueprint.error({}, { exit: 95 }) {}
