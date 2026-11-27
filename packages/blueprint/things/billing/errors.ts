import { Blueprint } from "orthograph";

/** That invoice is not this workspace's. */
export class InvoiceNotFound extends Blueprint.error({}, { exit: 97 }) {}
/** The payment provider refused the card. */
export class CardRefused extends Blueprint.error({}, { exit: 98 }) {}
