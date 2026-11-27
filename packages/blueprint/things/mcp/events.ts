import { Blueprint } from "orthograph";
import { Mcp } from "./thing.ts";

export const McpAdded = Blueprint.event({ mcp: Mcp.fields.id, url: Mcp.fields.url });
export const McpChecked = Blueprint.event({ mcp: Mcp.fields.id });
export const McpRemoved = Blueprint.event({ mcp: Mcp.fields.id });
