import { Blueprint } from "orthograph";

/** Only the person who took the conversation hands it back. */
export class NotYours extends Blueprint.error({}, { exit: 86 }) {}
