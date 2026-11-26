import { describe, expect, it } from "vitest";
import { createServers } from "./service.ts";
import type { Held, McpDeps } from "./types.ts";

const TOOLS = [
  {
    name: "find_page",
    description: "Finds a page",
    inputSchema: { type: "object", properties: { words: { type: "string" } } },
    annotations: { readOnlyHint: true },
  },
  {
    name: "write_page",
    description: "Writes a page",
    inputSchema: { type: "object", properties: { title: { type: "string" } } },
    annotations: { readOnlyHint: false },
  },
];

/** A server of one token, as `fetch` sees it; what it was asked is kept. */
function world() {
  const asked: string[] = [];
  const vault = new Map<string, string>();
  const held = new Map<string, Held>();
  const fetch: typeof globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as { id?: number; method: string; params?: { name?: string } };
    asked.push(body.method === "tools/call" ? `${body.method} ${body.params?.name}` : body.method);
    if (new Headers(init?.headers).get("authorization") !== "Bearer right") return new Response("no", { status: 401 });
    if (body.id === undefined) return new Response(null, { status: 202 });
    const result =
      body.method === "tools/list"
        ? { tools: TOOLS }
        : body.method === "tools/call"
          ? { content: [{ type: "text", text: "Done" }] }
          : { protocolVersion: "2025-06-18" };
    return new Response(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: body.id, result })}\n\n`, {
      headers: { "content-type": "text/event-stream" },
    });
  };
  const deps: McpDeps = {
    store: { all: () => [...held.values()], put: (one) => void held.set(one.server.id, one) },
    fetch,
    secrets: {
      put: async (name, value) => void vault.set(name, value),
      use: async (name, run) => (vault.has(name) ? run(vault.get(name) ?? "") : undefined),
    },
    clock: { now: () => 1_000 },
    ids: { next: (prefix) => `${prefix}_1` },
  };
  return { servers: createServers(deps), asked, vault };
}

describe("mcp-servers", () => {
  it("adds a server that answers: read-only tools start on, the others ask, and the secret is in the vault and nowhere else", async () => {
    const { servers, vault } = world();
    const added = await servers.handle({
      is: "add",
      server: { name: "Pages", url: "https://mcp.example.com/", secret: "right" },
      by: "Ama",
    });
    expect(added).toMatchObject({ is: "added", added: { _tag: "Added", server: { id: "srv_1", state: { _tag: "Works" } } } });
    const tools = added.is === "added" && added.added._tag === "Added" ? added.added.server.tools : [];
    expect(Object.fromEntries(tools.map(({ name, is }) => [name, is]))).toEqual({ find_page: "on", write_page: "ask" });
    expect(JSON.stringify(added)).not.toContain("right");
    expect(vault.get("mcp:srv_1")).toBe("right");
  });

  it("refuses, in words, a wrong secret and an address that is private or ours, and keeps nothing", async () => {
    const { servers } = world();
    expect(
      await servers.handle({ is: "add", server: { name: "Pages", url: "https://mcp.example.com/", secret: "wrong" }, by: "Ama" }),
    ).toMatchObject({
      added: { _tag: "Refused", why: expect.stringMatching(/sign-in/u) },
    });
    for (const url of ["http://mcp.example.com/", "https://127.0.0.1/", "https://app.co-worker.tech/"])
      expect(await servers.handle({ is: "add", server: { name: "X", url }, by: "Ama" })).toMatchObject({ added: { _tag: "Refused" } });
    expect(await servers.handle({ is: "list" })).toMatchObject({ is: "listed", held: [], tools: [] });
  });

  it("offers each tool as `mcp_<server>_<tool>` and calls it with the secret, for that call alone", async () => {
    const { servers, asked } = world();
    await servers.handle({ is: "add", server: { name: "Pages", url: "https://mcp.example.com/", secret: "right" }, by: "Ama" });
    const listed = await servers.handle({ is: "list" });
    expect(listed.is === "listed" && listed.tools.map(({ name }) => name)).toEqual(["mcp_srv_1_find_page", "mcp_srv_1_write_page"]);
    expect(await servers.handle({ is: "call", name: "mcp_srv_1_write_page", args: { title: "How we add" } })).toEqual({
      is: "called",
      says: "Done",
      ok: true,
    });
    expect(asked.at(-1)).toBe("tools/call write_page");
    expect(await servers.handle({ is: "call", name: "mcp_srv_1_nothing", args: {} })).toMatchObject({ is: "failed" });
  });
});
