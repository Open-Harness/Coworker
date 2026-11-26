import { bodyOf, isRecord, json, text } from "./http.ts";

/* `https://mcp.flows.test`: an MCP server with one tool that reads and one that writes, behind a token. */

const TOOLS = [
  {
    name: "find_page",
    description: "Finds a page by its words",
    inputSchema: { type: "object", properties: { words: { type: "string" } }, required: ["words"] },
    annotations: { readOnlyHint: true },
  },
  {
    name: "write_page",
    description: "Writes a page",
    inputSchema: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
    annotations: { readOnlyHint: false },
  },
];

export const MCP_TOKEN = "mcp-token-that-works";

export async function mcp(request: Request): Promise<Response | undefined> {
  if (new URL(request.url).host !== "mcp.flows.test") return undefined;
  if (request.headers.get("authorization") !== `Bearer ${MCP_TOKEN}`) return json({ error: "unauthorized" }, 401);
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const { id, method, params } = await bodyOf(request);
  const answer = (result: unknown): Response => json({ jsonrpc: "2.0", id, result });
  if (id === undefined) return new Response(null, { status: 202 });
  if (method === "initialize")
    return answer({ protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "Pages", version: "1" } });
  if (method === "tools/list") return answer({ tools: TOOLS });
  if (method === "tools/call") {
    const name = isRecord(params) ? text(params["name"]) : "";
    return answer({ content: [{ type: "text", text: name === "find_page" ? "Found: How we release" : "Written" }] });
  }
  return json({ jsonrpc: "2.0", id, error: { code: -32_601, message: "Method not found" } });
}
