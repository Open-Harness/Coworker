/* One MCP server over HTTP, as far as tools go: JSON-RPC in a POST, answered as JSON or as one event of a stream. */

export interface Listed {
  readonly name: string;
  readonly says: string;
  readonly readOnly: boolean;
  readonly input: Readonly<Record<string, unknown>>;
}

export type Said<T> = { readonly _tag: "Said"; readonly value: T } | { readonly _tag: "Wrong"; readonly why: string };

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const wrong = (why: string): { readonly _tag: "Wrong"; readonly why: string } => ({ _tag: "Wrong", why });

/** The answer with this id, whether the server sent JSON or a stream of events. */
function answerOf(type: string, body: string, id: number): unknown {
  const events = type.includes("text/event-stream")
    ? body
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
    : [body];
  for (const event of events) {
    try {
      const read: unknown = JSON.parse(event);
      if (isRecord(read) && read["id"] === id) return read;
    } catch {
      // Not an answer: the next one may be.
    }
  }
  return undefined;
}

export interface Server {
  readonly fetch: typeof fetch;
  readonly url: string;
  readonly secret: string | null;
}

async function post(s: Server, body: object, session: string | null): Promise<Response | undefined> {
  return s
    .fetch(s.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        ...(s.secret === null ? {} : { authorization: `Bearer ${s.secret}` }),
        ...(session === null ? {} : { "mcp-session-id": session }),
      },
      body: JSON.stringify(body),
    })
    .catch(() => undefined);
}

/** Starts a conversation with the server and runs `then` in it. Anything that goes wrong is said in words. */
export async function talk<T>(
  s: Server,
  then: (ask: (method: string, params: object) => Promise<Said<unknown>>) => Promise<Said<T>>,
): Promise<Said<T>> {
  let counted = 0;
  let session: string | null = null;
  const ask = async (method: string, params: object): Promise<Said<unknown>> => {
    counted += 1;
    const response = await post(s, { jsonrpc: "2.0", id: counted, method, params }, session);
    if (response === undefined) return wrong("The server could not be reached.");
    if (response.status === 401 || response.status === 403)
      return wrong(`The server did not accept the sign-in (it answered ${response.status}).`);
    if (!response.ok) return wrong(`The server answered ${response.status}.`);
    session = response.headers.get("mcp-session-id") ?? session;
    const answer = answerOf(response.headers.get("content-type") ?? "", await response.text(), counted);
    if (!isRecord(answer)) return wrong("The server did not answer in the way MCP does.");
    if (isRecord(answer["error"])) return wrong(`The server said: ${String(answer["error"]["message"] ?? "an error")}.`);
    return { _tag: "Said", value: answer["result"] };
  };
  const started = await ask("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "co-worker", version: "1" },
  });
  if (started._tag === "Wrong") return started;
  await post(s, { jsonrpc: "2.0", method: "notifications/initialized" }, session);
  return then(ask);
}

/** What the server says its tools are. */
export const toolsOf = (s: Server): Promise<Said<readonly Listed[]>> =>
  talk(s, async (ask) => {
    const said = await ask("tools/list", {});
    if (said._tag === "Wrong") return said;
    const tools = isRecord(said.value) && Array.isArray(said.value["tools"]) ? said.value["tools"] : [];
    return {
      _tag: "Said",
      value: tools.flatMap((one): Listed[] => {
        if (!isRecord(one) || typeof one["name"] !== "string") return [];
        const notes = isRecord(one["annotations"]) ? one["annotations"] : {};
        const input = isRecord(one["inputSchema"]) ? one["inputSchema"] : { type: "object", properties: {} };
        return [
          {
            name: one["name"],
            says: typeof one["description"] === "string" ? one["description"] : "",
            readOnly: notes["readOnlyHint"] === true,
            input,
          },
        ];
      }),
    };
  });

/** One tool called: the words it answered, and whether it said it went wrong. */
export const callOn = (s: Server, tool: string, args: unknown): Promise<Said<{ readonly says: string; readonly ok: boolean }>> =>
  talk(s, async (ask) => {
    const said = await ask("tools/call", { name: tool, arguments: isRecord(args) ? args : {} });
    if (said._tag === "Wrong") return said;
    const result = isRecord(said.value) ? said.value : {};
    const content = Array.isArray(result["content"]) ? result["content"] : [];
    const says = content.flatMap((one) => (isRecord(one) && typeof one["text"] === "string" ? [one["text"]] : [])).join("\n");
    return { _tag: "Said", value: { says, ok: result["isError"] !== true } };
  });
