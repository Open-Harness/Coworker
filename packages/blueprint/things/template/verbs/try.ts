import { Blueprint } from "orthograph";
import { Template } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { Words } from "../../../values/coworker.ts";

// `POST /templates/:template/try {place}`, from /managers/new/:template/check. Not a registered doing. It runs in a box:
// it installs, tests and says what it could not do, before anything is made.
export default Blueprint.operation(Template, {
  description: "Try a template on a place before making a manager from it: what it found, ran, and could not do.",
  payload: { workspace: Template.fields.workspace, template: Template.fields.id, place: Words },
  answer: { install: Words, test: Words, ran: Words, cannot: Words, notSure: Words },
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
