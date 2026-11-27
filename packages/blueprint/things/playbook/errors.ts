import { Blueprint } from "orthograph";
import { VersionNumber } from "../../values/coworker.ts";

/** That version of the playbook is not there. */
export class VersionNotFound extends Blueprint.error({ version: VersionNumber }, { exit: 45 }) {}
/** A manager's reach is a part of the one above it, never more (spec R1). */
export class ReachWider extends Blueprint.error({}, { exit: 46 }) {}
/** Someone saved a newer version since this one was read. */
export class VersionStale extends Blueprint.error({ newest: VersionNumber }, { exit: 47 }) {}
