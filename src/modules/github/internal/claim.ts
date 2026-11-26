import type { Claim, Installation } from "../types.ts";
import { allRepos } from "./pages.ts";
import { isRecord, recordAt, textAt } from "./payload.ts";

/** The App's own sign-in client. Its secret is used here only. */
export interface ClaimSettings {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly fetch: typeof fetch;
}

const API = "https://api.github.com";

/** One use of the code GitHub gave the browser. The token it buys is used here, and kept nowhere. */
async function personToken({ clientId, clientSecret, fetch }: ClaimSettings, code: string): Promise<string | undefined> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", "user-agent": "co-worker" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  const value: unknown = await response.json().catch(() => undefined);
  return response.status === 200 && isRecord(value) ? textAt(value, "access_token") : undefined;
}

/** The repos of the installation that this person administers; `undefined` if GitHub does not say. */
async function administered({ fetch }: ClaimSettings, token: string, id: number): Promise<ReadonlySet<string> | undefined> {
  const repos = await allRepos(fetch, `${API}/user/installations/${id}/repositories`, `token ${token}`);
  return (
    repos &&
    new Set(repos.filter((repo) => recordAt(repo, "permissions")?.["admin"] === true).map((repo) => textAt(repo, "full_name") ?? ""))
  );
}

/**
 * Whether the person GitHub signed in for `code` may give this installation to a workspace: they must administer every
 * repo it reaches. Seeing an installation is not enough, since anyone with access to one of its repos does, and its id
 * proves nothing, since ids are counted up.
 */
export async function claim(
  settings: ClaimSettings,
  installation: (id: number) => Promise<Installation | undefined>,
  id: number,
  code: string,
): Promise<Claim> {
  const token = await personToken(settings, code);
  if (token === undefined) return { _tag: "NotSignedIn" };
  const found = await installation(id);
  const mine = found === undefined ? undefined : await administered(settings, token, id);
  if (found === undefined || mine === undefined || found.repos.length === 0) return { _tag: "NotYours" };
  return found.repos.every((repo) => mine.has(repo)) ? { _tag: "Claimed", installation: found } : { _tag: "NotYours" };
}
