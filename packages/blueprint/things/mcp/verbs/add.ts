import { Blueprint } from "orthograph";
import { Mcp } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../workspace/roles.ts";
import { SecretValue } from "../../../values/coworker.ts";

// Doing `mcp.add`, which no screen presses: the page reaches it as `POST /settings/mcp-servers`, always with `name: ""`
// (`mcp-servers.tsx:71`, inventory, Gaps). The secret goes to the vault and is never read back.
export default Blueprint.operation(Mcp, {
  description: "Add an MCP server by its address, with its sign-in if it needs one.",
  payload: { workspace: Mcp.fields.workspace, name: Mcp.fields.name, url: Mcp.fields.url, secret: SecretValue },
  answer: { mcp: Mcp.fields.id },
  move: machine.moves.add,
  allowed: [owner.of("workspace")],
  idempotent: "request",
});
