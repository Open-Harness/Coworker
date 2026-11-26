/**
 * The outside web as the fast tier sees it: Google's and GitHub's OAuth endpoints, answered from the code itself. A test
 * signs in as a person by passing `outsideCode(person)` as the OAuth `code`.
 */
export interface OutsidePerson {
  readonly id: string;
  readonly email: string;
  readonly name: string;
}

const base64url = (text: string): string => Buffer.from(text, "utf8").toString("base64url");
const fromBase64url = (text: string): string => Buffer.from(text, "base64url").toString("utf8");

export const outsideCode = (person: OutsidePerson): string => base64url(JSON.stringify(person));

function personIn(code: string | null): OutsidePerson | undefined {
  if (code === null) return undefined;
  try {
    const value: unknown = JSON.parse(fromBase64url(code));
    if (typeof value !== "object" || value === null) return undefined;
    const { id, email, name } = value as Record<string, unknown>;
    return typeof id === "string" && typeof email === "string" && typeof name === "string" ? { id, email, name } : undefined;
  } catch {
    return undefined;
  }
}

/** An id token nobody signed. Better Auth decodes the one from Google's token endpoint without checking it. */
const unsignedJwt = (claims: Record<string, unknown>): string =>
  `${base64url(JSON.stringify({ alg: "none", typ: "JWT" }))}.${base64url(JSON.stringify(claims))}.`;

const json = (body: unknown, status = 200): Response => Response.json(body, { status });
const BEARER = /^Bearer gh-(?<code>.+)$/iu;

async function google(request: Request): Promise<Response> {
  const person = personIn(new URLSearchParams(await request.text()).get("code"));
  if (person === undefined) return json({ error: "invalid_grant" }, 400);
  const now = Math.floor(Date.now() / 1000);
  const idToken = unsignedJwt({
    iss: "https://accounts.google.com",
    sub: person.id,
    email: person.email,
    email_verified: true,
    name: person.name,
    iat: now,
    exp: now + 3600,
  });
  return json({ access_token: `g-${person.id}`, id_token: idToken, expires_in: 3600, token_type: "Bearer", scope: "openid email profile" });
}

async function githubToken(request: Request): Promise<Response> {
  const code = new URLSearchParams(await request.text()).get("code");
  if (personIn(code) === undefined) return json({ error: "bad_verification_code" });
  return json({ access_token: `gh-${code}`, token_type: "bearer", scope: "read:user,user:email" });
}

function githubApi(request: Request, path: string): Response {
  const person = personIn(BEARER.exec(request.headers.get("authorization") ?? "")?.groups?.["code"] ?? null);
  if (person === undefined) return json({ message: "Bad credentials" }, 401);
  if (path === "/user")
    return json({
      id: Number.parseInt(person.id, 10) || 1,
      login: person.name.toLowerCase().replaceAll(" ", "-"),
      name: person.name,
      email: null,
      avatar_url: "",
    });
  if (path === "/user/emails") return json([{ email: person.email, primary: true, verified: true, visibility: "private" }]);
  return json({ message: "Not Found" }, 404);
}

/** The provider's answer, or undefined when the request is for another host. */
export async function oauthProviders(request: Request): Promise<Response | undefined> {
  const { host, pathname } = new URL(request.url);
  if (host === "oauth2.googleapis.com" && pathname === "/token") return google(request);
  if (host === "github.com" && pathname === "/login/oauth/access_token") return githubToken(request);
  if (host === "api.github.com") return githubApi(request, pathname);
  return undefined;
}
