import { createVerify } from "node:crypto";
import { bodyOf, isRecord, json, list, next, text, type Json } from "./http.ts";
import { reposRoute } from "./github-repos.ts";
import { ALLOWED, calls, codes, installations, repoOf, repos, tokens, type Repo, type Token } from "./state.ts";

/*
 * api.github.com and github.com, as an App sees them. A call without the right is refused with GitHub's own words; a
 * call to something this world does not have answers 404 and is kept in `calls`, so it can be seen.
 */

const rights = (asked: unknown, allowed: Readonly<Record<string, string>>): Record<string, string> | undefined => {
  const wanted = isRecord(asked) ? Object.entries(asked) : Object.entries(allowed);
  const granted: Record<string, string> = {};
  for (const [name, level] of wanted) {
    if (allowed[name] === undefined || (level === "write" && allowed[name] !== "write")) return undefined;
    granted[name] = text(level);
  }
  return granted;
};

/** The App's own JWT: signed with its key, not stale, its id in `iss`. */
function appOf(authorization: string, app: { readonly id: string; readonly publicKey: string }): boolean {
  const [, head = "", body = "", signature = ""] = /^Bearer ([\w-]+)\.([\w-]+)\.([\w-]+)$/u.exec(authorization) ?? [];
  if (signature === "") return false;
  const claims: unknown = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (!isRecord(claims) || String(claims["iss"]) !== app.id) return false;
  return createVerify("RSA-SHA256").update(`${head}.${body}`).verify(app.publicKey, Buffer.from(signature, "base64url"));
}

const reposOf = (installation: number): readonly Repo[] => [...repos.values()].filter((repo) => repo.installation === installation);
const repoJson = (repo: Repo, login?: string) => ({
  full_name: repo.name,
  name: repo.name.split("/")[1],
  default_branch: "main",
  private: true,
  ...(login === undefined ? {} : { permissions: { admin: repo.people.get(login) === "admin" } }),
});

async function appRoute(request: Request, path: string): Promise<Response | undefined> {
  const [, id = "", rest = ""] = /^\/app\/installations\/(\d+)(\/access_tokens)?$/u.exec(path) ?? [];
  if (id === "") return path === "/app" ? json({ slug: "juno-test", permissions: ALLOWED }) : undefined;
  const installation = installations.get(Number(id));
  if (installation === undefined || !installation.on) return json({ message: "Not Found" }, 404);
  if (rest === "") return json({ id: Number(id), account: { login: installation.account }, permissions: installation.permissions });
  const body = await bodyOf(request);
  const permissions = rights(body["permissions"], installation.permissions);
  if (permissions === undefined) return json({ message: "The permissions requested are not granted to this installation." }, 422);
  const named = list(body["repositories"]).map(text);
  const reach = reposOf(Number(id)).filter(({ name }) => named.length === 0 || named.includes(name.split("/")[1] ?? ""));
  if (reach.length < named.length) return json({ message: "There is at least one repository that does not exist" }, 422);
  const token: Token = { token: `ghs_world${next()}`, installation: Number(id), repos: reach.map(({ name }) => name.toLowerCase()), permissions };
  tokens.set(token.token, token);
  return json({ token: token.token, expires_at: new Date(Date.now() + 3_600_000).toISOString(), permissions }, 201);
}

function userRoute(path: string, bearer: string): Response | undefined {
  const person = codes.get(bearer.replace(/^ghu_/u, ""));
  const [, id = ""] = /^\/user\/installations\/(\d+)\/repositories$/u.exec(path) ?? [];
  if (id === "") return undefined;
  if (person === undefined || !person.installations.includes(Number(id))) return json({ message: "Not Found" }, 404);
  const found = reposOf(Number(id)).map((repo) => repoJson(repo, person.login));
  return json({ total_count: found.length, repositories: found });
}

async function answer(request: Request, path: string, token: Token | undefined, body: Json, query: URLSearchParams): Promise<Response> {
  if (token === undefined) return json({ message: "Bad credentials" }, 401);
  if (path === "/installation/repositories") {
    const found = reposOf(token.installation).filter(({ name }) => token.repos.includes(name.toLowerCase()));
    return json({ total_count: found.length, repositories: found.map((repo) => repoJson(repo)) });
  }
  const [, owner = "", name = "", rest = ""] = /^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/u.exec(path) ?? [];
  const repo = repoOf(`${owner}/${name}`);
  if (repo === undefined || !token.repos.includes(repo.name.toLowerCase()) || installations.get(token.installation)?.on !== true)
    return json({ message: "Not Found" }, 404);
  if (rest === "") return json(repoJson(repo));
  return (await reposRoute({ method: request.method, rest, repo, token, body, query })) ?? json({ message: "Not Found" }, 404);
}

/** Answers for api.github.com and github.com, or undefined when the host is another's. */
export async function github(request: Request, app: { readonly id: string; readonly publicKey: string }): Promise<Response | undefined> {
  const { host, pathname, searchParams } = new URL(request.url);
  if (host === "github.com" && pathname === "/login/oauth/access_token") {
    const code = text((await bodyOf(request.clone() as Request))["code"]);
    return codes.has(code) ? json({ access_token: `ghu_${code}`, token_type: "bearer" }) : undefined;
  }
  if (host !== "api.github.com") return undefined;
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.replace(/^(?:token|Bearer) /u, "");
  if (bearer.startsWith("ghu_")) return userRoute(pathname, bearer);
  if (pathname.startsWith("/app")) return appOf(authorization, app) ? appRoute(request, pathname) : json({ message: "A JSON web token could not be decoded" }, 401);
  if (!bearer.startsWith("ghs_world")) return undefined;
  const token = tokens.get(bearer);
  const body = request.method === "GET" ? {} : await bodyOf(request.clone() as Request);
  const response = await answer(request, pathname, token, body, searchParams);
  const [, owner, name] = /^\/repos\/([^/]+)\/([^/]+)/u.exec(pathname) ?? [];
  calls.push({
    method: request.method,
    path: pathname,
    repo: owner === undefined ? null : `${owner}/${name}`,
    status: response.status,
    permissions: token?.permissions ?? null,
    body,
  });
  return response;
}
