import type { Answer } from "~/modules/api/types.ts";
import type { McpView } from "~/modules/views-workspace/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { ok, problem } from "./around.ts";

/* The MCP servers of the workspace: what each says it has and what each tool starts at, and adding one. The secret is never in a view. */

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): string => (typeof value === "string" ? value : "");

export async function mcpView(c: ConsoleDeps): Promise<McpView> {
  const [listed, managers] = await Promise.all([c.store.mcp({ is: "list" }), c.store.managers()]);
  const servers = listed.is === "listed" ? listed.held : [];
  return {
    servers: servers.map(({ server, by, added }) => ({
      ...server,
      by,
      added,
      usedBy: managers.filter(({ node }) => node.reach.grants.some(({ account }) => account === server.id)).map(({ node }) => node.name),
    })),
  };
}

/** `{name, url, secret?}`: a server is added when it answers, with a person's say. Refused, in words, when it is not public https, is ours, or does not accept the sign-in. */
export async function addServer(c: ConsoleDeps, body: unknown): Promise<Answer<unknown>> {
  if (c.who.role === "Member") return problem(403, "Only an Owner or a Builder adds a server.");
  if (!isRecord(body)) return problem(422, "Send {name, url, secret?}.");
  const secret = text(body["secret"]);
  const answered = await c.store.mcp({
    is: "add",
    server: { name: text(body["name"]), url: text(body["url"]), ...(secret === "" ? {} : { secret }) },
    by: c.who.name,
  });
  if (answered.is !== "added") return problem(500, "The workspace did not answer.");
  return ok(answered.added._tag === "Added" ? { server: answered.added.server } : { _tag: "Refused", why: answered.added.why });
}
