import type { Auth, SignedIn } from "~/modules/auth/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";

/**
 * People and Handles. `POST /api/me/emails {email}` mails a link that proves an address; `GET
 * /api/me/emails/verify?token=` takes it. `GET /api/workspaces/<id>/people` lists Handles; `POST .../people/handles
 * {person, kind, id, space?, display?}` is an Owner vouching for one.
 */
export const PEOPLE = /^\/api\/me\/emails(\/verify)?$|^\/api\/workspaces\/([A-Za-z0-9_-]{8,64})\/people(\/handles)?$/u;

/** The emailed link. A browser that follows it gets the page that takes it, where a person can sign in first. */
export const PROOF_LINK = /^\/api\/me\/emails\/verify$/u;
export function openProof(request: Request): Response | undefined {
  const { searchParams, origin } = new URL(request.url);
  if (request.method !== "GET" || request.headers.get("accept")?.includes("text/html") !== true) return undefined;
  const page = new URL("/join/email", origin);
  page.searchParams.set("token", searchParams.get("token") ?? "");
  return new Response(null, { status: 302, headers: { location: `${page.pathname}${page.search}` } });
}

const problem = (status: number, message: string): Response => Response.json({ error: message }, { status });
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null;
const text = (value: unknown): string | undefined => (typeof value === "string" && value.trim() !== "" ? value.trim() : undefined);
const STATUS = { NotMember: 404, NotOwner: 403, HeldByAnother: 409 } as const;
const answer = (result: { readonly _tag: string }): Response =>
  Response.json(result, { status: STATUS[result._tag as keyof typeof STATUS] ?? 200 });

async function emails(auth: Auth, workspaces: Workspaces, person: SignedIn, request: Request, verify: boolean): Promise<Response> {
  if (verify) {
    const proven = await auth.emailProven(person, new URL(request.url).searchParams.get("token") ?? "");
    if (proven === undefined) return problem(400, "The link is not good, or it is someone else's");
    await workspaces.linkEmail(person.userId, proven);
    return Response.json({ email: proven });
  }
  if (request.method !== "POST") return problem(405, "Use POST");
  const body: unknown = await request.json().catch(() => undefined);
  const email = isRecord(body) ? text(body["email"]) : undefined;
  if (email === undefined || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email)) return problem(400, "Send an email address");
  await auth.sendEmailProof(person, email);
  return Response.json({ sent: email.toLowerCase() }, { status: 202 });
}

async function handles(workspaces: Workspaces, person: SignedIn, request: Request, workspaceId: string): Promise<Response> {
  if (request.method !== "POST") return problem(405, "Use POST");
  const body: unknown = await request.json().catch(() => undefined);
  const [who, kind, id] = isRecord(body) ? [text(body["person"]), text(body["kind"]), text(body["id"])] : [];
  if (!isRecord(body) || who === undefined || kind === undefined || id === undefined) return problem(400, "Send person, kind and id");
  const [space, display] = [text(body["space"]), text(body["display"])];
  const handle = {
    kind,
    id,
    proof: "added" as const,
    ...(space === undefined ? {} : { space }),
    ...(display === undefined ? {} : { display }),
  };
  return answer(await workspaces.addHandle(person.userId, workspaceId, who, handle));
}

export async function routePeople(auth: Auth, workspaces: Workspaces, person: SignedIn, request: Request, match: RegExpExecArray) {
  const [, verify, workspaceId, part] = match;
  if (workspaceId === undefined) return emails(auth, workspaces, person, request, verify !== undefined);
  if (part !== undefined) return handles(workspaces, person, request, workspaceId);
  if (request.method !== "GET") return problem(405, "Use GET");
  const reached = await workspaces.reach(person.userId, workspaceId, "member");
  return reached._tag === "Reached" ? Response.json({ people: await reached.object.people() }) : problem(404, "No such workspace");
}
