import { Blueprint } from "orthograph";

/** That mail is already someone's. */
export class MailTaken extends Blueprint.error({}, { exit: 25 }) {}
/** The last way to sign in cannot be taken away. */
export class LastWay extends Blueprint.error({}, { exit: 26 }) {}
