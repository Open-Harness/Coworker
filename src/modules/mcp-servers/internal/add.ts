import { mcp } from "~/modules/mcp/service.ts";
import type { AddServer, Added, McpServer } from "~/modules/mcp/types.ts";
import type { McpDeps } from "../types.ts";
import { toolsOf } from "./client.ts";

/** The vault's name for a server's secret. It is the server's, and is not listed with the workspace's own. */
export const secretOf = (id: string): string => `mcp:${id}`;

/** Added when it is a public https address that answers with the sign-in given, and says its tools; read-only tools start on and the others ask. */
export async function add(c: McpDeps, input: AddServer, by: string): Promise<Added> {
  const name = input.name.trim();
  if (name === "") return { _tag: "Refused", why: "A server needs a name." };
  const url = input.url.trim();
  const barred = mcp.mayBe(url);
  if (barred !== null) return { _tag: "Refused", why: barred };
  const secret = input.secret === undefined || input.secret === "" ? null : input.secret;
  const found = await toolsOf({ fetch: c.fetch, url, secret });
  if (found._tag === "Wrong") return { _tag: "Refused", why: found.why };
  const id = c.ids.next("srv");
  if (secret !== null) await c.secrets.put(secretOf(id), secret);
  const server: McpServer = {
    id,
    name,
    url,
    signIn: secret === null ? null : { secret: secretOf(id) },
    tools: found.value.map(({ name: tool, says, readOnly }) => ({ name: tool, says, readOnly, is: mcp.starts({ readOnly }) })),
    state: { _tag: "Works", at: c.clock.now() },
    usedBy: [],
  };
  c.store.put({
    server,
    by,
    added: c.clock.now(),
    inputs: Object.fromEntries(found.value.map(({ name: tool, input: schema }) => [tool, schema])),
  });
  return { _tag: "Added", server };
}
