import type { AddResult, ModelConnection, ModelsDependencies } from "../types.ts";
import { secretName } from "./connect.ts";
import { probeOpenAICompatible } from "./probe.ts";
import { listConnections, saveConnection } from "./store.ts";

/** Sign in with ChatGPT, as pi-ai does it, with the redirect pasted back because a hosted app has no localhost. */
const AUTHORIZE_URL = "https://auth.openai.com/api/accounts/authorize";
const TOKEN_URL = "https://auth.openai.com/api/accounts/oauth/token";
export const REDIRECT_URI = "http://127.0.0.1:1455/auth/callback";
const RESOURCE = "https://api.openai.com/v1";
const DIRECT = "chatgpt.tokens.use.direct";
const SCOPE = `openid profile email offline_access resource.invoke ${DIRECT}`;
/** Tokens are refreshed this long before they expire. */
export const REFRESH_MARGIN_MS = 5 * 60 * 1000;

interface Tokens {
  readonly access: string;
  readonly refresh: string;
  readonly clientId: string;
}

const base64url = (bytes: Uint8Array<ArrayBuffer>): string =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
const random = (): string => base64url(crypto.getRandomValues(new Uint8Array(32)));
const pendingName = (state: string): string => `pending:chatgpt:${state}`;
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null;

/** One stable id per workspace, which OpenAI shows as the device that signed in. */
function hostId(sql: SqlStorage): string {
  sql.exec("CREATE TABLE IF NOT EXISTS model_host (only INTEGER PRIMARY KEY CHECK (only = 1), id TEXT NOT NULL)");
  const row = sql.exec("SELECT id FROM model_host").toArray()[0];
  if (row !== undefined) return String(row["id"]);
  const id = crypto.randomUUID();
  sql.exec("INSERT INTO model_host (only, id) VALUES (1, ?)", id);
  return id;
}

export async function startChatGpt({ sql, vault }: ModelsDependencies): Promise<string> {
  const verifier = random();
  const state = random();
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  await vault.put(pendingName(state), verifier);
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: "dynamic_agent_client",
    agent_name_hint: "Co-worker",
    ext_agent_host_id: `urn:uuid:${hostId(sql)}`,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    resource: RESOURCE,
    scope: SCOPE,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    nonce: random(),
  }).toString();
  return url.toString();
}

type Granted =
  | { readonly _tag: "Granted"; readonly tokens: Tokens; readonly expiresAt: number }
  | { readonly _tag: "Refused"; readonly error: string };

async function requestTokens({ fetch: send, clock }: ModelsDependencies, body: URLSearchParams, clientId: string): Promise<Granted> {
  const response = await send(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body,
  });
  const data: unknown = await response.json().catch(() => undefined);
  if (!response.ok || !isRecord(data)) return { _tag: "Refused", error: `ChatGPT refused the sign-in (${response.status})` };
  const { access_token: access, refresh_token: refresh, scope, expires_in: expiresIn } = data;
  if (typeof access !== "string" || typeof refresh !== "string" || typeof expiresIn !== "number")
    return { _tag: "Refused", error: "ChatGPT sent no tokens" };
  if (typeof scope !== "string" || !scope.split(/\s+/u).includes(DIRECT))
    return { _tag: "Refused", error: `ChatGPT did not grant ${DIRECT}` };
  return { _tag: "Granted", tokens: { access, refresh, clientId }, expiresAt: clock.now() + expiresIn * 1000 };
}

/** The pasted redirect, checked against the sign-in this workspace started. */
function readRedirect(pasted: string): { readonly code: string; readonly state: string; readonly clientId: string } | string {
  if (!URL.canParse(pasted.trim())) return "Paste the whole address the browser ended on";
  const url = new URL(pasted.trim());
  if (`${url.origin}${url.pathname}` !== REDIRECT_URI) return `The address should start with ${REDIRECT_URI}`;
  const error = url.searchParams.get("error");
  if (error !== null) return `ChatGPT said: ${error}`;
  const [code, state, clientId] = ["code", "state", "client_id"].map((name) => url.searchParams.get(name)?.trim() ?? "");
  return code === "" || state === "" || clientId === ""
    ? "The address is missing its code"
    : { code: code ?? "", state: state ?? "", clientId: clientId ?? "" };
}

export async function finishChatGpt(dependencies: ModelsDependencies, pasted: string): Promise<AddResult> {
  const { vault, sql, ids, clock } = dependencies;
  const redirect = readRedirect(pasted);
  if (typeof redirect === "string") return { _tag: "Invalid", reason: redirect };
  const verifier = await vault.use(pendingName(redirect.state), (value) => value);
  if (verifier._tag !== "Used") return { _tag: "Invalid", reason: "That sign-in was not started here, or was already used. Start again" };
  vault.remove(pendingName(redirect.state));
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: redirect.clientId,
    code: redirect.code,
    code_verifier: verifier.value,
    redirect_uri: REDIRECT_URI,
    resource: RESOURCE,
  });
  const granted = await requestTokens(dependencies, body, redirect.clientId);
  if (granted._tag === "Refused") return { _tag: "Invalid", reason: granted.error };
  const id = ids.next("chatgpt");
  await vault.put(secretName(id), JSON.stringify(granted.tokens));
  const probe = await probeOpenAICompatible(dependencies.fetch, RESOURCE, granted.tokens.access);
  const checkedAt = clock.now();
  const connection: ModelConnection = {
    id,
    source: "chatgpt",
    label: "ChatGPT",
    baseUrl: RESOURCE,
    models: probe._tag === "Works" ? probe.models : [],
    check: probe._tag === "Works" ? { _tag: "Works", checkedAt } : { _tag: "Failed", checkedAt, error: probe.error },
    expiresAt: granted.expiresAt,
  };
  saveConnection(sql, connection, checkedAt);
  return { _tag: "Added", connection };
}

async function refreshOne(dependencies: ModelsDependencies, connection: ModelConnection): Promise<void> {
  const { vault, sql, clock } = dependencies;
  const used = await vault.use(secretName(connection.id), async (value) => {
    const tokens = JSON.parse(value) as Tokens;
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: tokens.clientId,
      refresh_token: tokens.refresh,
      resource: RESOURCE,
    });
    return requestTokens(dependencies, body, tokens.clientId);
  });
  const granted: Granted = used._tag === "Used" ? used.value : { _tag: "Refused", error: "The stored sign-in could not be read" };
  if (granted._tag === "Refused") {
    saveConnection(
      sql,
      { ...connection, check: { _tag: "Failed", checkedAt: clock.now(), error: `Sign in with ChatGPT again: ${granted.error}` } },
      clock.now(),
    );
    return;
  }
  await vault.put(secretName(connection.id), JSON.stringify(granted.tokens));
  saveConnection(sql, { ...connection, expiresAt: granted.expiresAt, check: { _tag: "Works", checkedAt: clock.now() } }, clock.now());
}

const dueAt = (connection: ModelConnection): number | undefined =>
  connection.source === "chatgpt" && connection.expiresAt !== undefined && connection.check._tag === "Works"
    ? connection.expiresAt - REFRESH_MARGIN_MS
    : undefined;

/** Refreshes every sign-in within the margin of expiry. Returns when the next one falls due. */
export async function refreshDue(dependencies: ModelsDependencies): Promise<number | undefined> {
  for (const connection of listConnections(dependencies.sql)) {
    const due = dueAt(connection);
    if (due !== undefined && due <= dependencies.clock.now()) await refreshOne(dependencies, connection);
  }
  return nextRefresh(dependencies.sql);
}

export function nextRefresh(sql: SqlStorage): number | undefined {
  const due = listConnections(sql).flatMap((connection) => dueAt(connection) ?? []);
  return due.length === 0 ? undefined : Math.min(...due);
}
