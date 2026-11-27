import { Blueprint } from "orthograph";

/** A manager uses it: give that manager another first. */
export class EnvironmentInUse extends Blueprint.error({}, { exit: 90 }) {}
/** The workspace has an environment of that name. */
export class EnvironmentNameTaken extends Blueprint.error({}, { exit: 91 }) {}
