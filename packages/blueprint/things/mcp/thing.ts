import { Blueprint, Schema } from "orthograph";
import workspaceStore from "../../stores/workspace.ts";
import { Workspace } from "../workspace/thing.ts";
import { Name, Url } from "../../values/coworker.ts";

// An MCP server the workspace added, inside its object; its sign-in is in the vault. Each tool is on, ask or off, and the
// mark says whether a person chose it or the read-only rule did (inventory, Built against drawn: drawn wins).
export const Mcp = Blueprint.thing({
  description: "An MCP server: where it is, its tools, what each may do, and whether it works.",
  code: "MC",
  lives: workspaceStore,
  fields: {
    id: Blueprint.id("mcp"),
    workspace: Workspace.fields.id,
    name: Name,
    url: Url,
    tools: Blueprint.value(
      Schema.Record(
        Schema.String,
        Schema.Struct({ readOnly: Schema.Boolean, permission: Schema.Literals(["on", "ask", "off"]), chosen: Schema.Boolean }),
      ),
    ),
  },
});
