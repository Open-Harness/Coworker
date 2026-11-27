import { Blueprint } from "orthograph";
import { Template } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { TemplateIsOurs } from "../errors.ts";

// Not registered: "Take away" on the templates page only changes local state (`template-card.tsx:83`). The managers made
// from it keep their playbooks. Declared here; the binding marks it planned.
export default Blueprint.operation(Template, {
  description: "Take away a template the workspace saved. Managers made from it keep their playbooks.",
  payload: { workspace: Template.fields.workspace, template: Template.fields.id },
  answer: {},
  errors: [TemplateIsOurs],
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
