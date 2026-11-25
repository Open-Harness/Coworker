import { scriptedChat, seen, type SeenCall } from "./internal/scripted.ts";

/**
 * The model providers as the fast tier sees them, answered by Miniflare's `outboundService`: Anthropic, OpenAI,
 * Google, OpenCode and one OpenAI-compatible endpoint. Only the keys below work; any other gets the provider's own error.
 */
export const FAKE_KEYS = {
  anthropic: "sk-ant-test-works",
  openai: "sk-openai-test-works",
  google: "google-test-works",
  opencode: "opencode-test-works",
} as const;
export const FAKE_ENDPOINT = "https://models.example.test/v1";
export const FAKE_ENDPOINT_MODELS = ["scripted-mini", "scripted-large"] as const;

const json = (body: unknown, status = 200): Response => Response.json(body, { status });
const reply = { id: "msg_fake", type: "message", role: "assistant", content: [{ type: "text", text: "Ok" }] };
const completion = { id: "cmpl_fake", object: "chat.completion", choices: [{ index: 0, message: { role: "assistant", content: "Ok" } }] };

function anthropic(request: Request, path: string): Response {
  if (request.headers.get("x-api-key") !== FAKE_KEYS.anthropic) {
    return json({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }, 401);
  }
  if (path === "/v1/models") return json({ data: [{ id: "claude-haiku-test" }, { id: "claude-sonnet-test" }] });
  return path === "/v1/messages" ? json(reply) : json({ type: "error", error: { type: "not_found_error", message: "Not found" } }, 404);
}

function openAICompatible(request: Request, pathname: string, key: string | undefined, models: readonly string[]): Response {
  /** Each provider serves the same two calls under its own prefix. */
  const path = `/v1${/\/(?:models|chat\/completions)$/u.exec(pathname)?.[0] ?? pathname}`;
  const bearer = request.headers.get("authorization");
  if (key !== undefined && bearer !== `Bearer ${key}`) {
    return json({ error: { message: "Incorrect API key provided.", type: "invalid_request_error", code: "invalid_api_key" } }, 401);
  }
  if (path === "/v1/models") return json({ object: "list", data: models.map((id) => ({ id, object: "model" })) });
  return path === "/v1/chat/completions" ? json(completion) : json({ error: { message: "Not found" } }, 404);
}

/** The code a test pastes back in the ChatGPT redirect. The first tokens are near expiry, so a refresh is due at once. */
export const FAKE_CHATGPT_CODE = "chatgpt-code";

async function chatgptTokens(request: Request): Promise<Response> {
  const form = new URLSearchParams(await request.text());
  const scope = "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";
  if (form.get("grant_type") === "authorization_code") {
    if (form.get("code") !== FAKE_CHATGPT_CODE || (form.get("code_verifier") ?? "").length < 43)
      return json({ error: "invalid_grant" }, 400);
    return json({ access_token: "chatgpt-access-1", refresh_token: "chatgpt-refresh-1", id_token: "a.b.c", scope, expires_in: 240 });
  }
  const turn = Number(/^chatgpt-refresh-(\d+)$/u.exec(form.get("refresh_token") ?? "")?.[1] ?? Number.NaN);
  if (form.get("grant_type") !== "refresh_token" || Number.isNaN(turn)) return json({ error: "invalid_grant" }, 400);
  return json({ access_token: `chatgpt-access-${turn + 1}`, refresh_token: `chatgpt-refresh-${turn + 1}`, scope, expires_in: 3600 });
}

/** Whether the request carried the credential this fake host accepts. */
function credentialOf(request: Request, host: string): SeenCall["credential"] {
  const sent = request.headers.get(host === "api.anthropic.com" ? "x-api-key" : "authorization");
  if (sent === null) return "none";
  const right =
    host === "api.anthropic.com"
      ? sent === FAKE_KEYS.anthropic
      : host === "api.openai.com"
        ? sent === `Bearer ${FAKE_KEYS.openai}` || /^Bearer chatgpt-access-\d+$/u.test(sent)
        : sent === "Bearer endpoint-key";
  return right ? "right" : "wrong";
}

/** What each streamed call to the scripted models carried, as the isolate that answered saw it. Never a credential's value. */
export const modelCallsSeen: readonly SeenCall[] = seen;
export type { SeenCall };

/**
 * A streamed chat request goes to the scripted model, which asks for its credential and records what the call carried
 * in `modelCallsSeen`. Probes (not streamed) are answered as before.
 */
async function scriptedModels(request: Request, host: string, pathname: string): Promise<Response | undefined> {
  const wire =
    pathname === "/v1/chat/completions" && (host === "models.example.test" || host === "api.openai.com")
      ? "openai"
      : host === "api.anthropic.com" && pathname === "/v1/messages"
        ? "anthropic"
        : undefined;
  if (wire === undefined || request.method !== "POST" || !/"stream"\s*:\s*true/u.test(await request.clone().text())) return undefined;
  return scriptedChat(request, wire, credentialOf(request, host));
}

/** A provider's answer, or undefined when the request is for another host. */
export async function modelProviders(request: Request): Promise<Response | undefined> {
  const { host, pathname } = new URL(request.url);
  const scripted = await scriptedModels(request, host, pathname);
  if (scripted !== undefined) return scripted;
  if (host === "api.anthropic.com") return anthropic(request, pathname);
  if (host === "auth.openai.com" && pathname === "/api/accounts/oauth/token") return chatgptTokens(request);
  if (host === "api.openai.com") {
    const signedIn = /^Bearer chatgpt-access-\d+$/u.test(request.headers.get("authorization") ?? "");
    return openAICompatible(request, pathname, signedIn ? undefined : FAKE_KEYS.openai, ["gpt-test-mini"]);
  }
  if (host === "generativelanguage.googleapis.com")
    return openAICompatible(request, pathname, FAKE_KEYS.google, ["models/gemini-test-flash"]);
  if (host === "opencode.ai") return openAICompatible(request, pathname, FAKE_KEYS.opencode, ["opencode-test-mini"]);
  if (host === "models.example.test") {
    // The endpoint takes no key unless one is sent; a wrong one is refused.
    const sent = request.headers.get("authorization");
    return openAICompatible(request, pathname, sent === null ? undefined : "endpoint-key", FAKE_ENDPOINT_MODELS);
  }
  return undefined;
}
