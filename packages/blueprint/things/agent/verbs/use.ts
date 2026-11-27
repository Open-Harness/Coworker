import { Blueprint } from "orthograph";
import { Agent } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { Manager } from "../../manager/thing.ts";

// Doing `agent.use`. Registered; nothing presses it: "Use it in a manager" only toasts (`agents.tsx:63`, inventory, Gaps).
export default Blueprint.operation(Agent, {
  description: "Use a shared agent in a manager: the manager gets its own copy.",
  payload: { workspace: Agent.fields.workspace, agent: Agent.fields.id, manager: Manager.fields.id },
  answer: {},
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
