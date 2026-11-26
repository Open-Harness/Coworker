import type { Answer } from "~/modules/api/types.ts";
import type { Member } from "~/modules/console/types.ts";
import type { ConsoleFor } from "../types.ts";
import type { Role } from "~/modules/doings/types.ts";
import { personOf } from "~/modules/protocol/service.ts";
import type { Control } from "./control.ts";
import { isSameOrigin } from "./origin.ts";

/** `/api/ws/<id or address>/<what>`: the console's reads and its one door for changes. */
export const WS = /^\/api\/ws\/([^/]+)(\/.*)?$/u;

const ROLES: Readonly<Record<string, Role>> = { owner: "Owner", builder: "Builder", member: "Member" };
const says = (status: number, text: string): Response => Response.json({ says: text }, { status });

const respond = (answer: Answer<unknown>): Response =>
  answer._tag === "Ok"
    ? Response.json(answer.value, { headers: { "Cache-Control": "no-store" } })
    : Response.json({ says: answer.says }, { status: answer.status, headers: { "Cache-Control": "no-store" } });

async function membersOf(control: Control, workspace: string): Promise<readonly Member[]> {
  const members = await control.auth.membersOf(workspace);
  return members.map((one) => ({ id: personOf(one).id, email: one.email, name: personOf(one).name, role: ROLES[one.role] ?? "Member" }));
}

export async function routeWs(control: Control, consoleFor: ConsoleFor, request: Request, found: RegExpExecArray): Promise<Response> {
  const [, named = "", path = ""] = found;
  const asked = decodeURIComponent(named);
  const post = request.method === "POST";
  if (request.method !== "GET" && !post) return says(405, "Use GET or POST");
  if (post && !isSameOrigin(request)) return says(403, "Sent by another site");
  const person = await control.auth.signedIn(request.headers);
  if (person === undefined) return says(401, "Sign in first");
  const entry = (await control.workspaces.list(person.userId)).find(
    ({ workspaceId, address }) => workspaceId === asked || address === asked,
  );
  if (entry === undefined) return says(404, "There is no such workspace.");
  const reached = await control.workspaces.reach(person.userId, entry.workspaceId, "member");
  if (reached._tag !== "Reached") return says(404, "There is no such workspace.");
  const described = await reached.object.describe();
  if (described._tag !== "Found") return says(404, "There is no such workspace.");
  const people = await membersOf(control, entry.workspaceId);
  const me = people.find(({ id }) => id === personOf(person).id) ?? {
    id: personOf(person).id,
    email: person.email,
    name: personOf(person).name,
    role: ROLES[reached.role] ?? "Member",
  };
  const desk = consoleFor({
    object: reached.object,
    entry,
    since: described.profile.createdAt,
    person,
    me,
    people,
    workspaces: control.workspaces,
  });
  const url = new URL(request.url);
  const call = { path: path === "" ? "/" : path, query: url.searchParams };
  if (!post) return respond(await desk.read(call));
  const body: unknown = await request.json().catch(() => undefined);
  return respond(await desk.write({ ...call, body }));
}
