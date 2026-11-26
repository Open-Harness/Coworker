/*
 * Slack as the fast tier sees it. The fake Web API is answered by Miniflare's `outboundService` (see vitest.config.ts),
 * so it runs in the host process: the object under test really sends a request, and reads back what the fake saw
 * from `GET https://slack.test/__calls`. No network, no real token.
 */
export const FAKE_SLACK = {
  signingSecret: "test-signing-secret-not-a-real-one",
  botToken: "xoxb-test-token-not-a-real-one",
  botUserId: "UBOT",
  apiUrl: "https://slack.test/api/",
  callsUrl: "https://slack.test/__calls",
} as const;

/** One Web API call the fake received. */
export interface SlackCall {
  readonly method: string;
  readonly authorization: string | null;
  readonly body: Readonly<Record<string, unknown>>;
}

const calls: SlackCall[] = [];

/** A body as Slack's own client sends it: a JSON object or a url-encoded form. */
async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text === "") return {};
  if ((request.headers.get("content-type") ?? "").includes("json")) return JSON.parse(text) as Record<string, unknown>;
  return Object.fromEntries(new URLSearchParams(text));
}

/** The Web API's answer, or undefined when the request is for another host. */
export async function slackApi(request: Request): Promise<Response | undefined> {
  const { host, pathname } = new URL(request.url);
  if (host !== "slack.test") return undefined;
  if (pathname === "/__calls") {
    if (request.method === "DELETE") calls.length = 0;
    return Response.json(request.method === "DELETE" ? [] : calls);
  }
  const method = pathname.replace(/^\/api\//u, "");
  const body = await bodyOf(request);
  calls.push({ method, authorization: request.headers.get("authorization"), body });
  if (request.headers.get("authorization") !== `Bearer ${FAKE_SLACK.botToken}`) return Response.json({ ok: false, error: "invalid_auth" });
  if (method === "chat.postMessage") {
    return Response.json({
      ok: true,
      channel: body["channel"],
      ts: "1700000001.000200",
      message: { ts: "1700000001.000200", text: body["text"] },
    });
  }
  if (method === "users.info") {
    const id = String(body["user"]);
    return Response.json({ ok: true, user: { id, name: `name-of-${id.toLowerCase()}`, real_name: `Name of ${id}` } });
  }
  return Response.json({ ok: true });
}

const hex = (bytes: ArrayBuffer): string => [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

/** A request as Slack's Events API sends it, signed `v0=HMAC-SHA256(secret, "v0:<timestamp>:<body>")`. */
export async function slackEvent(
  payload: unknown,
  options: { readonly secret?: string; readonly timestamp: number; readonly retry?: number },
): Promise<Request> {
  const body = JSON.stringify(payload);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(options.secret ?? FAKE_SLACK.signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const seconds = String(options.timestamp);
  const signature = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`v0:${seconds}:${body}`)));
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-slack-request-timestamp": seconds,
    "x-slack-signature": `v0=${signature}`,
  };
  if (options.retry !== undefined)
    Object.assign(headers, { "x-slack-retry-num": String(options.retry), "x-slack-retry-reason": "http_timeout" });
  return new Request("https://object.test/in/slack", { method: "POST", headers, body });
}

/** An `app_mention` in a channel: the event Slack sends when someone writes `@launch …`. */
export const mention = (eventId: string, text: string, ts = "1700000000.000100") => ({
  type: "event_callback",
  token: "legacy-unused",
  team_id: "T1",
  api_app_id: "A1",
  event_id: eventId,
  event_time: 1_700_000_000,
  event: { type: "app_mention", user: "U1", text: `<@${FAKE_SLACK.botUserId}> ${text}`, ts, channel: "C1", event_ts: ts },
});
