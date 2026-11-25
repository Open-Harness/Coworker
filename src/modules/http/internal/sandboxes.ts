import type { SignedIn } from "~/modules/auth/types.ts";
import { sizeOf } from "~/modules/sandboxes/service.ts";
import type { WorkspaceApi } from "~/modules/workspace/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";
import { closed, mayDo, ownOf, settings } from "./kit.ts";

/**
 * `/api/workspaces/<id>/environments`, `/agents/<agent>/environment` and `/secrets/<name>`: the Environments screen,
 * an agent's environment, and the vault's write side. Owners and Builders change environments, Owners add secrets,
 * and a secret is never read back.
 */
export const SANDBOXES =
  /^\/api\/workspaces\/([A-Za-z0-9_-]{8,64})\/(?:environments|agents\/([^/]{1,240})\/environment|secrets\/([A-Za-z0-9_.-]{1,80}))$/u;

const STATUS = { NotProvisioned: 404, NoSuchEnvironment: 404, Invalid: 400 } as const;
const problem = (status: number, message: string): Response => Response.json({ error: message }, { status });
const answer = (result: { readonly _tag: string }): Response =>
  Response.json(result, { status: STATUS[result._tag as keyof typeof STATUS] ?? 200, headers: { "Cache-Control": "no-store" } });
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null;
const body = async (request: Request): Promise<Readonly<Record<string, unknown>>> => {
  const sent: unknown = await request.json().catch(() => undefined);
  return isRecord(sent) ? sent : {};
};

async function saveEnvironment(object: WorkspaceApi, request: Request): Promise<Response> {
  const sent = await body(request);
  const size = sizeOf(sent["size"] ?? "2 vCPU · 4 GB");
  const [name, setup, id] = [sent["name"], sent["setup"] ?? "", sent["id"]];
  if (typeof name !== "string" || typeof setup !== "string" || size === undefined || (id !== undefined && typeof id !== "string"))
    return problem(400, "Send a name, a setup script and a size");
  return answer(await object.saveEnvironment({ id, name, setup, size }));
}

/** An agent's name as the path has it, which is any name an agent may have. */
function nameIn(path: string): string | undefined {
  try {
    return decodeURIComponent(path);
  } catch {
    return undefined;
  }
}

async function assign(object: WorkspaceApi, person: SignedIn, path: string, request: Request): Promise<Response> {
  const [agent, environment] = [nameIn(path), (await body(request))["environment"]];
  if (agent === undefined) return problem(400, "That is not an agent's name");
  if (environment !== null && typeof environment !== "string") return problem(400, "Send environment: an id, or null for none");
  const assigned = await settings(object, person, "assignEnvironment", { agent, environment });
  if (assigned instanceof Response) return assigned;
  return assigned._tag === "NoSuchAgent" ? problem(404, `There is no agent ${agent}`) : answer(assigned);
}

async function storeSecret(object: WorkspaceApi, name: string, request: Request): Promise<Response> {
  const value = (await body(request))["value"];
  if (typeof value !== "string" || value === "") return problem(400, "Send the secret's value");
  return answer(await object.storeSecret(name, value));
}

export async function routeSandboxes(
  workspaces: Workspaces,
  person: SignedIn,
  request: Request,
  matched: RegExpExecArray,
): Promise<Response> {
  const [, workspaceId = "", agent, secret] = matched;
  const reached = await workspaces.reach(person.userId, workspaceId, "member");
  if (reached._tag !== "Reached") return problem(404, "No such workspace");
  const { object, role } = reached;
  if (agent === undefined && secret === undefined && request.method === "GET") {
    const refused = await closed(object, person, role, "environments");
    if (refused !== undefined) return refused;
  }
  if (agent === undefined && secret === undefined && request.method === "GET")
    return Response.json({ environments: await object.environments() }, { headers: { "Cache-Control": "no-store" } });
  if (request.method !== "PUT") return problem(405, "Use GET or PUT");
  if (role === "member") return problem(403, "Only Owners and Builders change environments and secrets");
  if (agent !== undefined) return assign(object, person, agent, request);
  if (secret !== undefined)
    return mayDo(person, role, await ownOf(object, person), "vault.write")
      ? storeSecret(object, secret, request)
      : problem(403, "Only an Owner adds secrets to the vault");
  return saveEnvironment(object, request);
}
