import type { Auth, SignedIn } from "~/modules/auth/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";
import { personOf } from "~/modules/protocol/service.ts";

/**
 * How people join, besides an emailed invite (Better Auth's own routes under `/api/auth/organization`):
 * `GET /api/workspaces/<id>/join` and `PUT .../join/links` and `PUT .../join/domains` are Settings, so Owners only;
 * `POST /api/join/link` is any signed-in person holding a link; `POST /api/join/request {address}` asks the Owners.
 */
export const JOINING = /^\/api\/workspaces\/([A-Za-z0-9_-]{8,64})\/join(\/links|\/domains)?$|^\/api\/join\/(link|request)$/u;

/**
 * What a browser needs before anyone is signed in: `GET /api/sign-in` says how people may, and `GET
 * /api/join/invite/<id>` what an emailed invite is for.
 */
export const DOORSTEP = /^\/api\/sign-in$|^\/api\/join\/invite\/([A-Za-z0-9_-]{8,64})$/u;

const problem = (status: number, message: string): Response => Response.json({ error: message }, { status });
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null;
const STATUS = { NotMember: 404, NotOwner: 403, InvalidDomain: 400, LinkInvalid: 404, NoSuchWorkspace: 404, Failed: 502 } as const;
const answer = (result: { readonly _tag: string }, ok = 200): Response =>
  Response.json(result, { status: STATUS[result._tag as keyof typeof STATUS] ?? ok, headers: { "Cache-Control": "no-store" } });

export async function routeDoorstep(auth: Auth, request: Request, inviteId: string | undefined): Promise<Response> {
  if (request.method !== "GET") return problem(405, "Use GET");
  if (inviteId === undefined) return Response.json({ ways: auth.signInWays });
  const invite = await auth.invitation(inviteId);
  return invite === undefined ? problem(404, "No such invite") : Response.json({ invite }, { headers: { "Cache-Control": "no-store" } });
}

async function useLink(workspaces: Workspaces, person: SignedIn, request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => undefined);
  if (!isRecord(body) || typeof body["workspaceId"] !== "string" || typeof body["secret"] !== "string") {
    return problem(400, "Send workspaceId and secret");
  }
  return answer(await workspaces.joinByLink(person.userId, body["workspaceId"], body["secret"]));
}

async function settings(workspaces: Workspaces, person: SignedIn, request: Request, workspaceId: string, part: string | undefined) {
  const body: unknown = request.method === "PUT" ? await request.json().catch(() => undefined) : undefined;
  if (part === undefined)
    return request.method === "GET" ? answer(await workspaces.joining(person.userId, workspaceId)) : problem(405, "Use GET");
  if (request.method !== "PUT") return problem(405, "Use PUT");
  if (part === "/links") {
    if (!isRecord(body) || typeof body["on"] !== "boolean") return problem(400, "Send on: true or false");
    return answer(await workspaces.setInviteLinks(person.userId, workspaceId, body["on"]));
  }
  const domains = isRecord(body) ? body["domains"] : undefined;
  if (!Array.isArray(domains) || !domains.every((domain) => typeof domain === "string"))
    return problem(400, "Send domains: a list of strings");
  return answer(await workspaces.setApprovedDomains(person.userId, workspaceId, domains));
}

async function askToJoin(workspaces: Workspaces, person: SignedIn, request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => undefined);
  if (!isRecord(body) || typeof body["address"] !== "string") return problem(400, "Send the workspace's address");
  const asker = { userId: person.userId, email: person.email.toLowerCase(), name: personOf(person).name };
  return answer(await workspaces.requestJoin(asker, body["address"].trim().toLowerCase()), 202);
}

export async function routeJoining(workspaces: Workspaces, person: SignedIn, request: Request, pathname: string): Promise<Response> {
  const match = JOINING.exec(pathname);
  if (match?.[1] === undefined) {
    if (request.method !== "POST") return problem(405, "Use POST");
    return match?.[3] === "request" ? askToJoin(workspaces, person, request) : useLink(workspaces, person, request);
  }
  return settings(workspaces, person, request, match[1], match[2]);
}
