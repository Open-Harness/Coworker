import { Blueprint } from "orthograph";
import { Mcp } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../workspace/roles.ts";

// Doing `mcp.remove` (`mcp-servers.tsx:156`); no handler today (inventory, Gaps).
export default Blueprint.operation(Mcp, {
  description: "Remove an MCP server. Managers that had it lose its tools.",
  payload: { workspace: Mcp.fields.workspace, mcp: Mcp.fields.id },
  answer: {},
  move: machine.moves.remove,
  allowed: [owner.of("workspace")],
  idempotent: "request",
});
