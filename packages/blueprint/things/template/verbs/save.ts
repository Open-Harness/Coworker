import { Blueprint } from "orthograph";
import { Template } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { TemplateNameTaken } from "../errors.ts";
import { Manager } from "../../manager/thing.ts";

// Doing `template.save`, on a manager's settings page: its playbook, as it is, becomes a template.
export default Blueprint.operation(Template, {
  description: "Save a manager's playbook as a template the workspace can make managers from.",
  payload: { workspace: Template.fields.workspace, manager: Manager.fields.id, name: Template.fields.name, about: Template.fields.about },
  answer: { template: Template.fields.id },
  errors: [TemplateNameTaken],
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
