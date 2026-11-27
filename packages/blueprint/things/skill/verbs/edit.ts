import { Blueprint } from "orthograph";
import { Skill } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";

// Not registered: the skills page shows its files read only, and "Add a skill" only toasts (`skills.tsx:76`, inventory,
// Gaps). Declared here; the binding marks it planned. Saving makes a new version.
export default Blueprint.operation(Skill, {
  description: "Change a shared skill's files.",
  payload: { workspace: Skill.fields.workspace, skill: Skill.fields.id, files: Skill.fields.files },
  answer: {},
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
