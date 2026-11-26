import { CATALOGUE, PRESETS } from "~/modules/actions/service.ts";
import type { Permission } from "~/modules/actions/types.ts";
import type { Auth, SignedIn } from "~/modules/auth/types.ts";
import { personOf } from "~/modules/protocol/service.ts";
import type { NoticeEvent, ProfileView, Weekday } from "~/modules/settings/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";
import { bodyOf, fresh, isRecord, ownOf, problem, reach, said, settings, text } from "./kit.ts";

/**
 * `roles` (what each preset may do, and what you may), `permissions` (an Owner's changes for one person) and `me` (your
 * own profile and notifications here). Presets stay Owner, Builder and Member; only single actions change per person.
 */

const CATEGORIES = [...new Set(CATALOGUE.map(({ category }) => category))];
const isPermission = (value: unknown): value is Permission => value === "on" || value === "off" || value === "ask";

async function roles(workspaces: Workspaces, person: SignedIn, workspaceId: string): Promise<Response> {
  const reached = await reach(workspaces, person, workspaceId, "member", "");
  if (reached instanceof Response) return reached;
  return fresh({
    presets: PRESETS,
    categories: CATEGORIES,
    actions: CATALOGUE.map(({ id, category, label, screen }) => ({ id, category, label, screen })),
    mine: { preset: reached.role, own: await ownOf(reached.object, person) },
  });
}

async function permissions(auth: Auth, workspaces: Workspaces, person: SignedIn, request: Request, workspaceId: string): Promise<Response> {
  const reached = await reach(workspaces, person, workspaceId, "settings", "Only an Owner sees and changes what people may do");
  if (reached instanceof Response) return reached;
  const members = (await auth.membersOf(workspaceId)).map((member) => ({ ...member, person: personOf(member).id }));
  if (request.method === "GET") {
    const changes = await settings(reached.object, person, "changes", null);
    if (changes instanceof Response) return changes;
    return fresh({
      people: members.map(({ person: id, name, email, role }) => ({
        person: id,
        name,
        email,
        preset: role,
        changes: "_tag" in changes ? [] : changes.filter(({ person: who }) => who === id),
      })),
    });
  }
  if (request.method !== "PUT") return problem(405, "Use GET or PUT");
  const body = await bodyOf(request);
  const [who, scope, key, value] = [text(body?.["person"]), body?.["scope"], text(body?.["key"]), body?.["value"]];
  if (who === undefined || key === undefined || (scope !== "category" && scope !== "action") || (value !== null && !isPermission(value)))
    return problem(400, "Send person, scope (category or action), key and value (on, off or null to remove)");
  if (!members.some(({ person: id }) => id === who)) return problem(404, "No such person in this workspace");
  const changed = await settings(reached.object, person, "setChange", { person: who, scope, key, value });
  return changed instanceof Response ? changed : said(changed);
}

const weekdays = (value: unknown): readonly Weekday[] | undefined =>
  Array.isArray(value) && value.every((day) => Number.isInteger(day) && day >= 0 && day <= 6) ? (value as Weekday[]) : undefined;

/** The profile fields a request may carry. A wrong type is a refusal; a field left out stays. */
function profileOf(body: Readonly<Record<string, unknown>>): Partial<ProfileView> | undefined {
  const zone = body["timeZone"];
  const hours = body["workingHours"];
  const days = isRecord(hours) ? weekdays(hours["days"]) : undefined;
  if ("timeZone" in body && zone !== null && typeof zone !== "string") return undefined;
  if ("language" in body && typeof body["language"] !== "string") return undefined;
  if (
    "workingHours" in body &&
    hours !== null &&
    !(isRecord(hours) && days !== undefined && typeof hours["from"] === "string" && typeof hours["to"] === "string")
  )
    return undefined;
  return {
    ...("timeZone" in body ? { timeZone: zone as string | null } : {}),
    ...("language" in body ? { language: body["language"] as string } : {}),
    ...("workingHours" in body
      ? {
          workingHours:
            hours === null || !isRecord(hours) ? null : { days: days ?? [], from: String(hours["from"]), to: String(hours["to"]) },
        }
      : {}),
  };
}

async function me(
  workspaces: Workspaces,
  person: SignedIn,
  request: Request,
  workspaceId: string,
  part: string | undefined,
): Promise<Response> {
  const reached = await reach(workspaces, person, workspaceId, "member", "");
  if (reached instanceof Response) return reached;
  const { object } = reached;
  const self = personOf(person);
  if (request.method === "GET" && part === undefined) {
    const [profile, notifications] = await Promise.all([
      settings(object, person, "profile", { person: self.id }),
      settings(object, person, "notifications", { person: self.id }),
    ]);
    if (profile instanceof Response) return profile;
    if (notifications instanceof Response) return notifications;
    return fresh({
      person: { ...self, email: person.email },
      role: reached.role,
      profile,
      notifications,
      own: await ownOf(object, person),
    });
  }
  if (request.method !== "PUT" || part === undefined) return problem(405, "Use GET, or PUT to /me/profile or /me/notifications");
  const body = await bodyOf(request);
  if (body === undefined) return problem(400, "Send a JSON body");
  if (part === "profile") {
    const fields = profileOf(body);
    if (fields === undefined)
      return problem(400, "Send timeZone (text or null), language (text) and workingHours ({days, from, to} or null)");
    const saved = await settings(object, person, "setProfile", { person: self.id, ...fields });
    return saved instanceof Response ? saved : said(saved);
  }
  const email = body["email"];
  const events: readonly string[] = ["question", "approval", "notice"];
  if (
    (email !== undefined && !(isRecord(email) && Object.values(email).every((on) => typeof on === "boolean"))) ||
    (body["quietHours"] !== undefined && typeof body["quietHours"] !== "boolean")
  )
    return problem(400, "Send email ({question, approval, notice}: true or false) and quietHours (true or false)");
  if (isRecord(email) && Object.keys(email).some((event) => !events.includes(event)))
    return problem(400, "Only question, approval and notice can be mailed");
  const saved = await settings(object, person, "setNotifications", {
    person: self.id,
    ...(isRecord(email) ? { email: email as Partial<Record<NoticeEvent, boolean>> } : {}),
    ...(typeof body["quietHours"] === "boolean" ? { quietHours: body["quietHours"] } : {}),
  });
  return saved instanceof Response ? saved : said(saved);
}

/** What the shell asks every few seconds: the person's role and what an Owner changed for them, nothing else. */
async function access(workspaces: Workspaces, person: SignedIn, request: Request, workspaceId: string): Promise<Response> {
  if (request.method !== "GET") return problem(405, "Use GET");
  const reached = await reach(workspaces, person, workspaceId, "member", "");
  return reached instanceof Response ? reached : fresh({ role: reached.role, own: await ownOf(reached.object, person) });
}

export async function routePeopleSettings(
  auth: Auth,
  workspaces: Workspaces,
  person: SignedIn,
  request: Request,
  workspaceId: string,
  part: string,
): Promise<Response | undefined> {
  if (part === "roles") return request.method === "GET" ? roles(workspaces, person, workspaceId) : problem(405, "Use GET");
  if (part === "access") return access(workspaces, person, request, workspaceId);
  if (part === "permissions") return permissions(auth, workspaces, person, request, workspaceId);
  if (part === "me" || part.startsWith("me/"))
    return me(workspaces, person, request, workspaceId, part === "me" ? undefined : part.slice(3));
  return undefined;
}
