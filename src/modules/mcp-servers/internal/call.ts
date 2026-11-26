import { mcp } from "~/modules/mcp/service.ts";
import type { McpAnswer, McpDeps, McpTool } from "../types.ts";
import { callOn } from "./client.ts";
import { secretOf } from "./add.ts";

/** Every tool of every server, as a model is offered it. */
export function listed(c: McpDeps): McpAnswer {
  const all = c.store.all();
  const tools = all.flatMap(({ server, inputs }): McpTool[] =>
    server.tools.map((tool) => ({
      name: mcp.toolName(server.id, tool.name),
      server: server.id,
      says: tool.says,
      input: inputs[tool.name] ?? { type: "object", properties: {} },
    })),
  );
  return { is: "listed", held: all, tools };
}

/** A tool called by the name a model sees. Whether it may be is the mandate's to say: this does what it is asked, with the secret for this call alone. */
export async function callTool(c: McpDeps, name: string, args: unknown): Promise<McpAnswer> {
  for (const { server } of c.store.all()) {
    const tool = server.tools.find((one) => mcp.toolName(server.id, one.name) === name);
    if (tool === undefined) continue;
    const reach = { fetch: c.fetch, url: server.url };
    const said =
      server.signIn === null
        ? await callOn({ ...reach, secret: null }, tool.name, args)
        : await c.secrets.use(secretOf(server.id), (secret) => callOn({ ...reach, secret }, tool.name, args));
    if (said === undefined)
      return { is: "failed", why: `${server.name} has lost its sign-in, so it cannot be used. Add the server again.` };
    return said._tag === "Wrong"
      ? { is: "failed", why: `${server.name}: ${said.why}` }
      : { is: "called", says: said.value.says, ok: said.value.ok };
  }
  return { is: "failed", why: `${name} is not a tool of any server this workspace has.` };
}
