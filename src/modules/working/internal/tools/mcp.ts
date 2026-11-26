import type { Mandate } from "~/modules/reach/types.ts";
import type { McpTool } from "~/modules/mcp-servers/types.ts";
import { type Call, said, type Result, type Tool, wrong } from "../tool.ts";

/* What an agent does with the tools of an MCP server: each is called as the server says it takes, and whether it may be is the mandate's. */

/** Whether the mandate gives any tool of a server at all, so that a work that has none never asks for the list. */
export const hasServers = (mandate: Mandate): boolean =>
  mandate.grants.some(({ may }) => Object.keys(may).some((name) => name.startsWith("mcp_")));

function toolOf(tool: McpTool): Tool {
  return {
    name: tool.name,
    description: tool.says,
    parameters: tool.input,
    run: async (call: Call, args: unknown): Promise<Result> => {
      const done = await call.c.outside.mcp({ is: "call", name: tool.name, args });
      if (done.is === "called") return done.ok ? said(done.says) : wrong(done.says === "" ? "The tool said it went wrong." : done.says);
      return { _tag: "Waits", why: done.is === "failed" ? done.why : "The server did not answer." };
    },
  };
}

/** Every tool of every server the workspace has, as a model is offered it. The work's mandate says which of them it may use. */
export async function serverTools(outside: Pick<Call["c"]["outside"], "mcp">, mandate: Mandate): Promise<readonly Tool[]> {
  if (!hasServers(mandate)) return [];
  const listed = await outside.mcp({ is: "list" }).catch(() => undefined);
  return listed?.is === "listed" ? listed.tools.map(toolOf) : [];
}
