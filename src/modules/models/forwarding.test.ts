import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { Env } from "~/main.ts";
import { countingIds, fakeClock } from "~/modules/clock/testing.ts";
import { openVault } from "~/modules/vault/service.ts";
import { testMasterKey } from "~/modules/vault/testing.ts";
import { openModels } from "./service.ts";
import type { Models } from "./types.ts";

const { WORKSPACE } = env as unknown as Env;
const KEY = "sekret-key-1234";

/** A provider whose streamed answers the test releases by hand, and a record of what it was sent. */
function provider(reply: (request: Request) => Response | undefined = () => undefined) {
  const sent: { readonly url: string; readonly headers: Headers; readonly body: string }[] = [];
  let open: ReadableStreamDefaultController<Uint8Array> | undefined;
  const send: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    sent.push({ url: request.url, headers: request.headers, body: await request.clone().text() });
    const custom = reply(request);
    if (custom !== undefined) return custom;
    const { pathname } = new URL(request.url);
    if (pathname.endsWith("/models"))
      return Response.json({ data: [{ id: "m-first" }, { id: "claude-haiku-t" }, { id: "claude-sonnet-t" }] });
    if (!(await request.clone().text()).includes('"stream":true')) return Response.json({ id: "probe", content: [], choices: [] });
    const body = new ReadableStream<Uint8Array>({ start: (controller) => void (open = controller) });
    return new Response(body, { headers: { "content-type": "text/event-stream", "set-cookie": "tracking=1" } });
  };
  return { send, sent, release: () => open };
}

/** Models over a fresh Workspace object's storage, with a count of the `vault.use` calls still running. */
function withForwarding<T>(send: typeof fetch, fn: (models: Models, using: () => number) => Promise<T>): Promise<T> {
  return runInDurableObject(WORKSPACE.get(WORKSPACE.newUniqueId()), (_instance, state) => {
    const clock = fakeClock();
    const real = openVault({
      sql: state.storage.sql,
      masterKeys: { current: testMasterKey(), retired: [] },
      clock,
      audit: () => undefined,
    });
    let using = 0;
    const vault = {
      ...real,
      use: async <U>(name: string, run: (plaintext: string) => Promise<U> | U) => {
        using += 1;
        try {
          return await real.use(name, run);
        } finally {
          using -= 1;
        }
      },
    };
    return fn(openModels({ sql: state.storage.sql, vault, clock, ids: countingIds(), fetch: send }), () => using);
  });
}

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 5));
const call = (id: string, tail: string, extra: Record<string, string> = {}) => ({
  path: `/${id}/v1/${tail}`,
  body: JSON.stringify({ model: "workspace-model", stream: true, messages: [] }),
  headers: { accept: "text/event-stream", ...extra },
});

describe("forwarding a manager's model call", () => {
  it("holds the key only while the answer streams, and adds it itself", async () => {
    const upstream = provider();
    await withForwarding(upstream.send, async (models, using) => {
      await models.addEndpoint({ label: "Ours", baseUrl: "https://models.example.test/v1", key: KEY });
      const route = models.route();
      if (route._tag !== "Route") throw new Error(route.reason);
      expect(route).toEqual({ _tag: "Route", connectionId: "endpoint_1", label: "Ours", source: "endpoint", api: "openai-completions" });
      expect(using()).toBe(0);

      const answer = await models.forward(
        call(route.connectionId, "chat/completions", { authorization: "Bearer not-a-key", cookie: "a=b" }),
      );
      expect(answer.status).toBe(200);
      expect([...answer.headers.keys()].sort()).toEqual(["content-type"]);
      // The head is here, the body is not: the key is still being held.
      expect(using()).toBe(1);
      const request = upstream.sent.at(-1);
      expect(request?.url).toBe("https://models.example.test/v1/chat/completions");
      expect(request?.headers.get("authorization")).toBe(`Bearer ${KEY}`);
      expect(request?.headers.has("cookie")).toBe(false);
      expect(JSON.parse(request?.body ?? "null")).toMatchObject({ model: "m-first" });

      const reader = answer.body?.getReader();
      upstream.release()?.enqueue(new TextEncoder().encode("data: one\n\n"));
      expect(new TextDecoder().decode((await reader?.read())?.value)).toBe("data: one\n\n");
      expect(using()).toBe(1);
      upstream.release()?.close();
      expect((await reader?.read())?.done).toBe(true);
      await settle();
      expect(using()).toBe(0);
    });
  });

  it("lets go of the key when the manager stops listening", async () => {
    const upstream = provider();
    await withForwarding(upstream.send, async (models, using) => {
      await models.addEndpoint({ label: "Ours", baseUrl: "https://models.example.test/v1", key: KEY });
      const answer = await models.forward(call("endpoint_1", "chat/completions"));
      expect(using()).toBe(1);
      await answer.body?.cancel();
      await settle();
      expect(using()).toBe(0);
    });
  });

  it("speaks Anthropic's format with its own header, and picks Sonnet", async () => {
    const upstream = provider();
    await withForwarding(upstream.send, async (models) => {
      await models.addKey({ source: "anthropic", key: KEY });
      const answer = await models.forward(
        call("anthropic_1", "messages", { "anthropic-beta": "tools-2026", authorization: "Bearer not-a-key" }),
      );
      expect(answer.status).toBe(200);
      const request = upstream.sent.at(-1);
      expect(request?.url).toBe("https://api.anthropic.com/v1/messages");
      expect(request?.headers.get("x-api-key")).toBe(KEY);
      expect(request?.headers.get("anthropic-version")).toBe("2023-06-01");
      expect(request?.headers.get("anthropic-beta")).toBe("tools-2026");
      expect(request?.headers.has("authorization")).toBe(false);
      expect(JSON.parse(request?.body ?? "null")).toMatchObject({ model: "claude-sonnet-t" });
      await answer.body?.cancel();
    });
  });

  it("scrubs the key from a refusal and does not follow a redirect", async () => {
    let arm: "none" | "refuse" | "redirect" = "none";
    const upstream = provider((request) => {
      if (arm === "none" || !request.url.endsWith("/chat/completions")) return undefined;
      return arm === "refuse"
        ? Response.json({ error: { message: `Incorrect API key provided: ${KEY}` } }, { status: 401, headers: { "set-cookie": "a=b" } })
        : new Response(null, { status: 302, headers: { location: "https://elsewhere.test/" } });
    });
    await withForwarding(upstream.send, async (models) => {
      await models.addEndpoint({ label: "Ours", baseUrl: "https://models.example.test/v1", key: KEY });
      arm = "refuse";
      const refused = await models.forward(call("endpoint_1", "chat/completions"));
      const text = await refused.text();
      expect(refused.status).toBe(401);
      expect(text).toContain("Incorrect API key provided: [key]");
      expect(text).not.toContain(KEY);
      expect(refused.headers.has("set-cookie")).toBe(false);
      arm = "redirect";
      const moved = await models.forward(call("endpoint_1", "chat/completions"));
      expect(moved.status).toBe(502);
      expect(await moved.text()).toContain("redirect");
    });
  });

  it("refuses a connection that is gone, a wrong format and a body that is not JSON", async () => {
    await withForwarding(provider().send, async (models) => {
      await models.addEndpoint({ label: "Ours", baseUrl: "https://models.example.test/v1", key: KEY });
      expect((await models.forward(call("endpoint_9", "chat/completions"))).status).toBe(409);
      expect((await models.forward(call("endpoint_1", "messages"))).status).toBe(400);
      expect((await models.forward({ ...call("endpoint_1", "chat/completions"), body: "not json" })).status).toBe(400);
      expect((await models.forward({ ...call("endpoint_1", "chat/completions"), path: "/endpoint_1/v1/../../admin" })).status).toBe(409);
      expect(models.route()).toMatchObject({ _tag: "Route" });
      models.remove("endpoint_1");
      expect(models.route()).toEqual({ _tag: "NoModel", reason: expect.stringContaining("No model is connected") });
    });
  });
});
