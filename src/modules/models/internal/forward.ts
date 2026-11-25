import type { Vault } from "~/modules/vault/types.ts";
import type { ModelCall, ModelConnection, ModelsDependencies } from "../types.ts";
import { secretName } from "./connect.ts";
import { apiOf, chooseModel } from "./route.ts";
import { findConnection } from "./store.ts";

const PATH = /^\/([A-Za-z0-9_-]{1,64})\/v1\/(chat\/completions|messages)$/u;
/** The only headers a manager's call may carry onward. Its own credential, if it had one, is not among them. */
const KEPT_REQUEST = ["accept", "anthropic-version", "anthropic-beta"] as const;
/** The only headers of the provider's answer a manager sees. */
const KEPT_RESPONSE = ["content-type", "retry-after"] as const;
const MAX_ERROR_CHARS = 20_000;

const failure = (status: number, message: string): Response =>
  Response.json({ type: "error", error: { type: "workspace_error", message } }, { status, headers: { "cache-control": "no-store" } });

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null;

/** The stored secret's parts that must never leave: a ChatGPT sign-in keeps two tokens as JSON. */
function secretsIn(secret: string): readonly string[] {
  const parsed = ((): unknown => {
    try {
      return secret.startsWith("{") ? JSON.parse(secret) : undefined;
    } catch {
      return undefined;
    }
  })();
  const tokens = isRecord(parsed) ? [parsed["access"], parsed["refresh"]] : [];
  return [secret, ...tokens.flatMap((token) => (typeof token === "string" ? [token] : []))].filter((part) => part !== "");
}

const scrubbed = (text: string, secrets: readonly string[]): string =>
  secrets.reduce((clean, part) => clean.replaceAll(part, "[key]"), text);

const bearerOf = (connection: ModelConnection, secret: string): string => {
  if (connection.source !== "chatgpt") return secret;
  const parsed: unknown = JSON.parse(secret);
  return isRecord(parsed) && typeof parsed["access"] === "string" ? parsed["access"] : "";
};

function requestOf(connection: ModelConnection, secret: string, call: ModelCall, body: string): Request {
  const sent = Object.fromEntries(Object.entries(call.headers).map(([name, value]) => [name.toLowerCase(), value]));
  const headers = new Headers({ "content-type": "application/json" });
  for (const name of KEPT_REQUEST) if (sent[name] !== undefined) headers.set(name, sent[name]);
  if (apiOf(connection) === "anthropic-messages") {
    headers.set("x-api-key", secret);
    if (!headers.has("anthropic-version")) headers.set("anthropic-version", "2023-06-01");
    return new Request(`${connection.baseUrl}/v1/messages`, { method: "POST", headers, body, redirect: "manual" });
  }
  const bearer = bearerOf(connection, secret);
  if (bearer !== "") headers.set("authorization", `Bearer ${bearer}`);
  return new Request(`${connection.baseUrl}/chat/completions`, { method: "POST", headers, body, redirect: "manual" });
}

function keptHeaders(from: Headers): Headers {
  const kept = new Headers();
  for (const name of KEPT_RESPONSE) {
    const value = from.get(name);
    if (value !== null) kept.set(name, value);
  }
  return kept;
}

/**
 * The body with the model the workspace chose. The one the call names is kept only when the connection lists it, which
 * is how a route's chosen model arrives; the placeholder or anything else becomes the connection's own pick.
 */
function withModel(body: string, connection: ModelConnection): string | undefined {
  const parsed: unknown = JSON.parse(body);
  if (!isRecord(parsed)) return undefined;
  const named = parsed["model"];
  const model = typeof named === "string" && connection.models.includes(named) ? named : chooseModel(connection);
  return model === undefined ? undefined : JSON.stringify({ ...parsed, model });
}

/**
 * Sends one request with the secret and returns the answer. The secret is read by `vault.use` and the call to `use`
 * lasts until the answer's last byte has been handed on, so a streamed answer is forwarded from inside it. Nothing
 * outside `use` ever holds the secret, and a failure answer is scrubbed of it.
 */
function within(vault: Vault, name: string, label: string, send: (secret: string) => Promise<Response>): Promise<Response> {
  return new Promise((resolve) => {
    const { readable, writable } = new TransformStream<Uint8Array>();
    let answered = false;
    const answer = (response: Response): void => {
      answered = true;
      resolve(response);
    };
    vault
      .use(name, async (secret) => {
        const secrets = secretsIn(secret);
        try {
          const upstream = await send(secret);
          // A redirect would carry the credential to another address, so it is refused, not followed.
          if (upstream.status >= 300 && upstream.status < 400) {
            answer(failure(502, `${label} answered with a redirect, which the workspace does not follow.`));
            return;
          }
          if (upstream.ok && upstream.body !== null) {
            answer(new Response(readable, { status: upstream.status, headers: keptHeaders(upstream.headers) }));
            await upstream.body.pipeTo(writable);
            return;
          }
          const text = scrubbed((await upstream.text()).slice(0, MAX_ERROR_CHARS), secrets);
          answer(new Response(text, { status: upstream.ok ? 502 : upstream.status, headers: keptHeaders(upstream.headers) }));
        } catch (error) {
          if (answered) throw error;
          answer(failure(502, scrubbed(`Could not reach ${label}: ${error instanceof Error ? error.message : String(error)}`, secrets)));
        }
      })
      .then((used) => {
        if (used._tag !== "Used")
          answer(failure(409, `The credential for ${label} could not be read. Add it again under Settings → Keys.`));
      })
      .catch(() => {
        // A stream that broke after it began has already errored its reader; before that, `answer` was called above.
        if (!answered) answer(failure(502, `The call to ${label} failed.`));
      });
  });
}

export async function forward(dependencies: ModelsDependencies, call: ModelCall): Promise<Response> {
  const { sql, vault, fetch: send } = dependencies;
  const match = PATH.exec(call.path);
  const connection = match?.[1] === undefined ? undefined : findConnection(sql, match[1]);
  if (match === null || connection === undefined)
    return failure(409, "That model connection is gone. Ask again and the workspace will pick one that works.");
  if (connection.check._tag !== "Works") return failure(409, `${connection.label} is not working: ${connection.check.error}`);
  if (match[2] !== (apiOf(connection) === "anthropic-messages" ? "messages" : "chat/completions"))
    return failure(400, `${connection.label} does not take that kind of request`);
  if (chooseModel(connection) === undefined) return failure(502, `${connection.label} lists no models`);
  const body = await Promise.resolve()
    .then(() => withModel(call.body, connection))
    .catch(() => undefined);
  if (body === undefined) return failure(400, "The request was not JSON");
  return within(vault, secretName(connection.id), connection.label, (secret) => send(requestOf(connection, secret, call, body)));
}
