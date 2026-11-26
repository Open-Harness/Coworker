import type { SendOutcome } from "~/modules/triggers/types.ts";
import type { GitHubApi, Installation, Permissions, TokenResult } from "../types.ts";
import { claim } from "./claim.ts";
import { allRepos } from "./pages.ts";
import { isRecord, textAt } from "./payload.ts";

/** The App's own credentials. The key is PKCS #8 PEM, as `openssl pkcs8 -topk8 -nocrypt` writes it. */
export interface AppCredentials {
  readonly appId: string;
  /** The App's name in its own address: `github.com/apps/<slug>`. */
  readonly slug?: string | undefined;
  readonly privateKey: string;
  /** The App's sign-in client. Without it nobody can prove an installation is theirs, so none can be connected. */
  readonly client?: { readonly clientId: string; readonly clientSecret: string } | undefined;
  readonly fetch: typeof fetch;
  readonly now: () => number;
}

/** No App set up: GitHub is out of reach, and says so. */
export const noApp: GitHubApi = {
  installUrl: () => undefined,
  installation: async () => undefined,
  claim: async () => ({ _tag: "NotSignedIn" }),
  token: async () => ({ _tag: "Failed", reason: "The GitHub App is not set up" }),
  comment: async () => ({ _tag: "Gone", reason: "The GitHub App is not set up" }),
};

const API = "https://api.github.com";
const HOUR = 3_600_000;
const base64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/u, "");
const encoded = (value: unknown): string => base64url(new TextEncoder().encode(JSON.stringify(value)));

async function appJwt({ appId, privateKey, now }: AppCredentials): Promise<string> {
  const der = Uint8Array.from(atob(privateKey.replace(/-----[^-]+-----|\s/gu, "")), (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const seconds = Math.floor(now() / 1000);
  const body = `${encoded({ alg: "RS256", typ: "JWT" })}.${encoded({ iat: seconds - 60, exp: seconds + 540, iss: appId })}`;
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(body)));
  return `${body}.${base64url(signature)}`;
}

const headers = (auth: string) => ({ authorization: auth, accept: "application/vnd.github+json", "user-agent": "co-worker" });

async function call(credentials: AppCredentials, auth: string, path: string, init: { method?: string; body?: unknown } = {}) {
  const response = await credentials.fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: { ...headers(auth), ...(init.body === undefined ? {} : { "content-type": "application/json" }) },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
  const value: unknown = await response.json().catch(() => undefined);
  return { status: response.status, value: isRecord(value) ? value : {} };
}

async function token(
  credentials: AppCredentials,
  installation: number,
  repo: string | undefined,
  permissions: Permissions,
): Promise<TokenResult> {
  const jwt = `Bearer ${await appJwt(credentials)}`;
  const name = repo?.split("/")[1];
  const body = { permissions, ...(name === undefined ? {} : { repositories: [name] }) };
  const { status, value } = await call(credentials, jwt, `/app/installations/${installation}/access_tokens`, { method: "POST", body });
  const granted = textAt(value, "token");
  if (status !== 201 || granted === undefined) return { _tag: "Failed", reason: `GitHub answered ${status}` };
  const expires = Date.parse(textAt(value, "expires_at") ?? "");
  const expiresAt = Math.min(Number.isNaN(expires) ? credentials.now() + HOUR : expires, credentials.now() + HOUR);
  return { _tag: "Token", token: { token: granted, repo: repo ?? "", permissions, expiresAt } };
}

async function installation(credentials: AppCredentials, id: number): Promise<Installation | undefined> {
  const jwt = `Bearer ${await appJwt(credentials)}`;
  const found = await call(credentials, jwt, `/app/installations/${id}`);
  const account = textAt(isRecord(found.value["account"]) ? found.value["account"] : undefined, "login");
  if (found.status !== 200 || account === undefined) return undefined;
  const reading = await token(credentials, id, undefined, { metadata: "read" });
  if (reading._tag === "Failed") return undefined;
  const repos = await allRepos(credentials.fetch, `${API}/installation/repositories`, `token ${reading.token.token}`);
  return repos && { id, account, repos: repos.flatMap((repo) => textAt(repo, "full_name") ?? []) };
}

async function comment(credentials: AppCredentials, id: number, repo: string, number: number, body: string): Promise<SendOutcome> {
  const granted = await token(credentials, id, repo, { issues: "write", pull_requests: "write" });
  if (granted._tag === "Failed") return granted;
  const { status } = await call(credentials, `token ${granted.token.token}`, `/repos/${repo}/issues/${number}/comments`, {
    method: "POST",
    body: { body },
  });
  if (status === 201) return { _tag: "Sent" };
  return status === 404 || status === 410
    ? { _tag: "Gone", reason: `GitHub answered ${status}` }
    : { _tag: "Failed", reason: `GitHub answered ${status}` };
}

/** The App calling GitHub: a JWT for the App, then an installation token per call. Without an id and key, `noApp`. */
export function appApi(
  settings: Omit<AppCredentials, "appId" | "privateKey"> & {
    readonly appId?: string | undefined;
    readonly privateKey?: string | undefined;
  },
): GitHubApi {
  const { appId = "", privateKey = "" } = settings;
  if (appId === "" || privateKey === "") return noApp;
  const credentials = { ...settings, appId, privateKey };
  return {
    installUrl: (state) =>
      credentials.slug === undefined || credentials.client === undefined
        ? undefined
        : `https://github.com/apps/${encodeURIComponent(credentials.slug)}/installations/new?state=${encodeURIComponent(state)}`,
    installation: (id) => installation(credentials, id),
    claim: async (id, code) =>
      credentials.client === undefined
        ? { _tag: "NotSignedIn" }
        : claim({ ...credentials.client, fetch: credentials.fetch }, (one) => installation(credentials, one), id, code),
    token: (id, repo, permissions) => token(credentials, id, repo, permissions),
    comment: (id, repo, number, body) => comment(credentials, id, repo, number, body),
  };
}
