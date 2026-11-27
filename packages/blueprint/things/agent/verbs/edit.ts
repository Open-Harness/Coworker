import { Blueprint } from "orthograph";
import { Agent } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";

// Not registered: Save after an edit only toasts (`agents.tsx:131`, inventory, Gaps). Declared here; the binding marks it
// planned. Saving makes a new version.
export default Blueprint.operation(Agent, {
  description: "Change a shared agent: what it is told, its model, its tools and skills.",
  payload: {
    workspace: Agent.fields.workspace,
    agent: Agent.fields.id,
    told: Agent.fields.told,
    model: Agent.fields.model,
    tools: Agent.fields.tools,
    skills: Agent.fields.skills,
  },
  answer: {},
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
