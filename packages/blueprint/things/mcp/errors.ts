import { Blueprint } from "orthograph";

/** The server has no tool of that name. */
export class ToolNotFound extends Blueprint.error({}, { exit: 89 }) {}
