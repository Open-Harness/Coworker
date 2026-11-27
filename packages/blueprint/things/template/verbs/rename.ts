import { Blueprint } from "orthograph";
import { Template } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { TemplateIsOurs, TemplateNameTaken } from "../errors.ts";

// Not registered: the templates page's rename only changes local state (`template-card.tsx:56`). Declared here; the
// binding marks it planned.
export default Blueprint.operation(Template, {
  description: "Rename a template the workspace saved.",
  payload: { workspace: Template.fields.workspace, template: Template.fields.id, name: Template.fields.name },
  answer: {},
  errors: [TemplateNameTaken, TemplateIsOurs],
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
