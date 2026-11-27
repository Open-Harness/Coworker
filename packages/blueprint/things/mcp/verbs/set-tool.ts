import { Blueprint } from "orthograph";
import { Mcp } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { ToolNotFound } from "../errors.ts";
import { Name, Permission } from "../../../values/coworker.ts";

// Doing `mcp.tool` (`mcp-servers.tsx:62`); no handler today (inventory, Gaps). The tool is then marked chosen.
export default Blueprint.operation(Mcp, {
  description: "Say whether one tool of an MCP server may run alone, with a yes, or not at all.",
  payload: { workspace: Mcp.fields.workspace, mcp: Mcp.fields.id, tool: Name, permission: Permission },
  answer: {},
  errors: [ToolNotFound],
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
