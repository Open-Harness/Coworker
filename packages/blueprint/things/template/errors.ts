import { Blueprint } from "orthograph";

/** The workspace has a template of that name. */
export class TemplateNameTaken extends Blueprint.error({}, { exit: 50 }) {}
/** Our templates ship in code: they can be copied, not renamed or taken away. */
export class TemplateIsOurs extends Blueprint.error({}, { exit: 51 }) {}
