import type { SignedIn } from "~/modules/auth/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";
import { bodyOf, confirmed, fresh, mayDo, ownOf, problem, reach, said, settings, text } from "./kit.ts";

/**
 * Keys and connections, after a key is added: test again, replace a key, edit an endpoint, remove a connection, and
 * the vault's secrets by name. A key goes in and a test result comes out; nothing here ever returns one.
 */

const OWNER_ONLY = "Only an Owner changes keys and connections";

async function model(
  workspaces: Workspaces,
  person: SignedIn,
  request: Request,
  workspaceId: string,
  id: string,
  check: boolean,
): Promise<Response> {
  const reached = await reach(workspaces, person, workspaceId, "settings", OWNER_ONLY);
  if (reached instanceof Response) return reached;
  const { object } = reached;
  if (check) {
    if (request.method !== "POST") return problem(405, "Use POST");
    const checked = await settings(object, person, "recheckModel", { id });
    return checked instanceof Response ? checked : said(checked);
  }
  if (request.method === "DELETE") {
    if (!(await confirmed(request, id))) return problem(400, `Send {"confirm": "${id}"} to remove this connection and its key`);
    const removed = await settings(object, person, "removeModel", { id });
    return removed instanceof Response ? removed : said(removed);
  }
  if (request.method !== "PUT") return problem(405, "Use POST to /check, PUT to change or DELETE to remove");
  const body = await bodyOf(request);
  const [key, label, baseUrl] = [text(body?.["key"]), text(body?.["label"]), text(body?.["baseUrl"])];
  if (body === undefined || (key === undefined && label === undefined && baseUrl === undefined))
    return problem(400, "Send key, or label and baseUrl for an endpoint");
  const changed =
    label === undefined && baseUrl === undefined
      ? await settings(object, person, "replaceModelKey", { id, key: key ?? "" })
      : await settings(object, person, "editEndpoint", {
          id,
          ...(label === undefined ? {} : { label }),
          ...(baseUrl === undefined ? {} : { baseUrl }),
          ...(key === undefined ? {} : { key }),
        });
  return changed instanceof Response ? changed : said(changed);
}

/** Secret names, for the Environments screen's setup scripts: Owners and Builders. Their values are never sent. */
async function secrets(
  workspaces: Workspaces,
  person: SignedIn,
  request: Request,
  workspaceId: string,
  name: string | undefined,
): Promise<Response | undefined> {
  const reached = await reach(workspaces, person, workspaceId, "member", "");
  if (reached instanceof Response) return reached;
  const { object, role } = reached;
  if (name === undefined && request.method === "GET") {
    if (role === "member") return problem(403, "Only Owners and Builders see the vault's secret names");
    const names = await settings(object, person, "secretNames", null);
    return names instanceof Response ? names : fresh({ secrets: names });
  }
  if (name === undefined || request.method !== "DELETE") return undefined;
  if (!mayDo(person, role, await ownOf(object, person), "vault.write")) return problem(403, "Your role cannot change the vault");
  if (!(await confirmed(request, name))) return problem(400, `Send {"confirm": "${name}"} to remove this secret`);
  const removed = await settings(object, person, "removeSecret", { name });
  return removed instanceof Response ? removed : said(removed);
}

async function connections(workspaces: Workspaces, person: SignedIn, workspaceId: string): Promise<Response> {
  const reached = await reach(workspaces, person, workspaceId, "settings", OWNER_ONLY);
  if (reached instanceof Response) return reached;
  return fresh({ github: await reached.object.gitHub() });
}

export async function routeKeys(
  workspaces: Workspaces,
  person: SignedIn,
  request: Request,
  workspaceId: string,
  part: string,
): Promise<Response | undefined> {
  const modelMatch = /^models\/([A-Za-z0-9_-]{4,80})(\/check)?$/u.exec(part);
  if (modelMatch?.[1] !== undefined && modelMatch[1] !== "chatgpt")
    return model(workspaces, person, request, workspaceId, modelMatch[1], modelMatch[2] !== undefined);
  const secretMatch = /^secrets(?:\/([A-Za-z0-9_.-]{1,80}))?$/u.exec(part);
  if (secretMatch !== null) return secrets(workspaces, person, request, workspaceId, secretMatch[1]);
  if (part === "connections") return request.method === "GET" ? connections(workspaces, person, workspaceId) : problem(405, "Use GET");
  return undefined;
}
