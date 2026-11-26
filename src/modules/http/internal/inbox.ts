import type { SignedIn } from "~/modules/auth/types.ts";
import type { Answer } from "~/modules/workspace/types.ts";
import { personOf } from "~/modules/protocol/service.ts";
import type { InboxItem } from "~/modules/workspace/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";
import { routeAudit } from "./audit.ts";

/** `/api/workspaces/<id>/inbox[/<itemId>]` and `/api/workspaces/<id>/audit`. */
export const INBOX = /^\/api\/workspaces\/([A-Za-z0-9_-]{8,64})\/(inbox|audit)(?:\/([A-Za-z0-9_:.%-]{1,300}))?$/u;

const problem = (status: number, message: string): Response => Response.json({ error: message }, { status });
const fresh = (body: unknown, status = 200): Response => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null;

const DECISIONS: Readonly<Record<string, Answer["decision"]>> = {
  "Allow once": "allow",
  "Always allow": "always",
  Deny: "deny",
  // A request to join.
  "Let them in": "allow",
  "Say no": "deny",
};

/** An approval's buttons decide; anything else, an option of a question or a person's own words, is text. */
function answerOf(item: InboxItem | undefined, body: unknown, person: SignedIn): Answer | undefined {
  if (!isRecord(body)) return undefined;
  const { id, name } = personOf(person);
  const choice = typeof body["choice"] === "string" ? body["choice"] : undefined;
  const text = typeof body["text"] === "string" ? body["text"].trim() : "";
  const decision = item?.kind === "approval" && choice !== undefined ? DECISIONS[choice] : undefined;
  if (decision !== undefined) return { decision, text: choice ?? "", byId: id, byName: name };
  const words = text !== "" ? text : (choice ?? "");
  return words === "" ? undefined : { decision: "text", text: words, byId: id, byName: name };
}

export async function routeInbox(workspaces: Workspaces, person: SignedIn, request: Request, match: RegExpExecArray): Promise<Response> {
  const [, workspaceId = "", part, encoded] = match;
  const itemId = encoded === undefined ? undefined : decodeURIComponent(encoded);
  if (part === "audit") return routeAudit(workspaces, person, request, workspaceId, itemId === "export");
  const reached = await workspaces.reach(person.userId, workspaceId, "member");
  if (reached._tag !== "Reached") return problem(404, "No such workspace");
  const mine = await reached.object.inbox(personOf(person).id);
  if (itemId === undefined) return request.method === "GET" ? fresh({ items: mine }) : problem(405, "Use GET");
  const item = mine.find(({ id }) => id === itemId);
  if (request.method === "GET") return item === undefined ? problem(404, "No such item") : fresh({ item });
  if (request.method !== "POST") return problem(405, "Use GET or POST");
  const answer = answerOf(item, await request.json().catch(() => undefined), person);
  if (answer === undefined) return problem(400, "Send a choice or your own words as text");
  const result = await workspaces.answer(person.userId, workspaceId, itemId, answer);
  const status = { NoSuchItem: 404, NotMember: 404, AlreadyAnswered: 409, Failed: 502, Answered: 200 }[result._tag];
  return fresh(result, status);
}
