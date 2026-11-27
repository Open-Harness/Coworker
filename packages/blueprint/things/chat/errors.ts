import { Blueprint } from "orthograph";

/** That line is not in the chat, so nothing forks from it. */
export class LineNotFound extends Blueprint.error({}, { exit: 35 }) {}
/** The chat is answering already; say it again once it is done. */
export class ChatBusy extends Blueprint.error({}, { exit: 36 }) {}
