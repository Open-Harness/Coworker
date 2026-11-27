import { Blueprint } from "orthograph";

/** That finding is not in the walk. */
export class FindingNotFound extends Blueprint.error({}, { exit: 53 }) {}
