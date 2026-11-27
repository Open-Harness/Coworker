import { Blueprint } from "orthograph";
import { Mcp } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { Manager } from "../../manager/thing.ts";

// Not registered: "Which managers have it" only changes local state (`mcp-servers.tsx:147`, inventory, Gaps). Declared
// here; the binding marks it planned.
export default Blueprint.operation(Mcp, {
  description: "Give an MCP server's tools to a manager.",
  payload: { workspace: Mcp.fields.workspace, mcp: Mcp.fields.id, manager: Manager.fields.id },
  answer: {},
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
