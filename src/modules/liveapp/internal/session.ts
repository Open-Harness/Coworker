import type { Failed, Fetch, Session, SignIn } from "../types.ts";

const failed = (reason: string): Failed => ({ _tag: "Failed", reason });

/** A session over `fetch` with one cookie jar. Requests name the app's own origin, as its CSRF check requires. */
function sessionOf(baseUrl: string, fetch: Fetch, jar: Map<string, string>): Session {
  const send: Session["send"] = (method, path, body) =>
    fetch(`${baseUrl}${path}`, {
      method,
      redirect: "manual",
      headers: {
        origin: baseUrl,
        cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  return { send, json: async <T>(method: string, path: string, body?: unknown) => (await (await send(method, path, body)).json()) as T };
}

const keep = (response: Response, jar: Map<string, string>): void => {
  for (const cookie of response.headers.getSetCookie()) {
    const [pair = ""] = cookie.split(";");
    const at = pair.indexOf("=");
    if (at > 0) jar.set(pair.slice(0, at), pair.slice(at + 1));
  }
};

/** Signs in as `email` for real: the app emails a link, `obtainLink` reads it, and following it gives the cookie. */
export async function signIn({ baseUrl, fetch, email, name, obtainLink }: SignIn): Promise<Session | Failed> {
  const jar = new Map<string, string>();
  const link = await obtainLink(() =>
    sessionOf(baseUrl, fetch, jar).send("POST", "/api/auth/sign-in/magic-link", { email, name, callbackURL: "/" }),
  );
  if (link === undefined) return failed(`No sign-in link reached ${email}`);
  const followed = await fetch(link, { redirect: "manual" });
  keep(followed, jar);
  if (jar.size === 0) return failed(`The sign-in link did not give a session (it answered ${followed.status})`);
  const session = sessionOf(baseUrl, fetch, jar);
  const me = await session.send("GET", "/api/workspaces");
  return me.ok ? session : failed(`The session was not accepted (${me.status})`);
}
