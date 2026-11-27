import { Blueprint } from "orthograph";

/** The connector said no: the sign-in was refused or the app is not installed. */
export class ConnectorRefused extends Blueprint.error({}, { exit: 83 }) {}
/** Only WhatsApp is linked by scanning a code. */
export class NothingToScan extends Blueprint.error({}, { exit: 84 }) {}
