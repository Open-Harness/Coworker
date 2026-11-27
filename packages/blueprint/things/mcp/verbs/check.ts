import { Blueprint } from "orthograph";
import { Mcp } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";

// Doing `mcp.check` (`mcp-servers.tsx:152`); no handler today (inventory, Gaps).
export default Blueprint.operation(Mcp, {
  description: "Check that an MCP server still answers, and read its tools again.",
  payload: { workspace: Mcp.fields.workspace, mcp: Mcp.fields.id },
  answer: {},
  move: machine.moves.check,
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
