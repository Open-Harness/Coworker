import type { SignedIn } from "~/modules/auth/types.ts";
import type { WorkspaceApi } from "~/modules/workspace/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";

/** `/api/workspaces/<id>/models`: the Keys screen. Settings, so the Owner preset. */
export const MODELS = /^\/api\/workspaces\/([A-Za-z0-9_-]{8,64})\/models(\/chatgpt)?$/u;

const problem = (status: number, message: string): Response => Response.json({ error: message }, { status });
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null;
const text = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

async function add(object: WorkspaceApi, body: unknown): Promise<Response> {
  if (!isRecord(body)) return problem(400, "Send a JSON body");
  const source = body["source"];
  if (source === "anthropic" || source === "openai" || source === "google" || source === "opencode") {
    const key = text(body["key"]) ?? "";
    const label = text(body["label"]);
    return Response.json(await object.addModelKey({ source, key, ...(label === undefined ? {} : { label }) }), { status: 201 });
  }
  if (source === "chatgpt") return Response.json(await object.startChatGpt());
  if (source === "endpoint") {
    const key = text(body["key"]);
    const input = { label: text(body["label"]) ?? "", baseUrl: text(body["baseUrl"]) ?? "", ...(key === undefined ? {} : { key }) };
    return Response.json(await object.addModelEndpoint(input), { status: 201 });
  }
  return problem(400, "source is anthropic, openai, google, opencode, endpoint or chatgpt");
}

/** The address the browser ended on after ChatGPT sign-in, pasted back. */
async function finish(object: WorkspaceApi, body: unknown): Promise<Response> {
  const redirectUrl = isRecord(body) ? text(body["redirectUrl"]) : undefined;
  if (redirectUrl === undefined) return problem(400, "Send redirectUrl");
  return Response.json(await object.finishChatGpt(redirectUrl), { status: 201 });
}

export async function routeModels(
  workspaces: Workspaces,
  person: SignedIn,
  request: Request,
  workspaceId: string,
  chatgpt: boolean,
): Promise<Response> {
  const reached = await workspaces.reach(person.userId, workspaceId, "settings");
  if (reached._tag === "NotMember") return problem(404, "No such workspace");
  if (reached._tag === "NotOwner") return problem(403, "Only an Owner can change model keys");
  if (chatgpt)
    return request.method === "POST" ? finish(reached.object, await request.json().catch(() => undefined)) : problem(405, "Use POST");
  if (request.method === "GET") {
    const [connections, readiness] = await Promise.all([reached.object.modelConnections(), reached.object.modelReadiness()]);
    return Response.json({ connections, readiness }, { headers: { "Cache-Control": "no-store" } });
  }
  if (request.method === "POST") return add(reached.object, await request.json().catch(() => undefined));
  return problem(405, "Use GET or POST");
}
