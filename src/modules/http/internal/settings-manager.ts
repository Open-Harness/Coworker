import { CATALOGUE, CATEGORY_DEFAULTS } from "~/modules/actions/service.ts";
import type { SignedIn } from "~/modules/auth/types.ts";
import { templateCards } from "~/modules/manager/service.ts";
import type { ManagerObjects } from "~/modules/manager/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";
import { closed, fresh, problem, reach, said, settings } from "./kit.ts";

/**
 * A manager's own screens beyond its board: one task with its comments and history, its Permissions with what every
 * action defaults to, and the template gallery. The board's settings and a task's changes are buttons (`actions/<id>`).
 */
export const MANAGER_SETTINGS =
  /^\/api\/workspaces\/([A-Za-z0-9_-]{8,64})\/managers\/([A-Za-z0-9_-]{4,64})\/(tasks\/[A-Za-z0-9-]{1,12}|permissions)$/u;

export async function routeManagerSettings(
  workspaces: Workspaces,
  managers: ManagerObjects,
  person: SignedIn,
  request: Request,
  match: RegExpExecArray,
): Promise<Response> {
  const [, workspaceId = "", managerId = "", part = ""] = match;
  if (request.method !== "GET") return problem(405, "Use GET");
  const reached = await reach(workspaces, person, workspaceId, "member", "");
  if (reached instanceof Response) return reached;
  const refused = await closed(reached.object, person, reached.role, part.startsWith("tasks/") ? "task" : "manager-settings");
  if (refused !== undefined) return refused;
  const entry = (await reached.object.managers()).find((manager) => manager.managerId === managerId);
  if (entry === undefined) return problem(404, "No such manager");
  const manager = managers.get(entry.objectId, entry.region);
  if (part.startsWith("tasks/")) {
    const found = await manager.task(part.slice("tasks/".length));
    return found._tag === "Task" ? fresh({ task: found.detail }) : problem(404, "No such task");
  }
  const found = await manager.permissions();
  if (found._tag !== "Permissions") return problem(404, "No such manager");
  return fresh({
    permissions: found.permissions,
    actions: CATALOGUE.map(({ id, category, label, screen, permission }) => ({
      id,
      category,
      label,
      screen,
      default: permission ?? CATEGORY_DEFAULTS[category],
    })),
    categoryDefaults: CATEGORY_DEFAULTS,
  });
}

/** `templates`, `email` and `email/test`: workspace-wide screens a manager is made from or reached by. */
export async function routeWorkspaceLevel(
  workspaces: Workspaces,
  person: SignedIn,
  request: Request,
  workspaceId: string,
  part: string,
): Promise<Response | undefined> {
  const reached = await reach(workspaces, person, workspaceId, "member", "");
  if (reached instanceof Response) return reached;
  const { object, role } = reached;
  if (part === "email" && request.method === "GET") {
    const refused = await closed(object, person, role, "manager-settings");
    if (refused !== undefined) return refused;
  }
  if (part === "templates") return request.method === "GET" ? fresh({ templates: templateCards() }) : problem(405, "Use GET");
  if (part === "email" && request.method === "GET") {
    const general = await settings(object, person, "general", null);
    if (general instanceof Response) return general;
    const addresses = (await object.managers()).map(({ managerId, name, address }) => ({
      managerId,
      name,
      address,
      taskAddress: address.replace("@", "+dt-<number>@"),
      how: "Our domain, nothing to set up",
      status: "Live",
    }));
    return fresh({ ending: `.${general.address}@${general.mailDomain}`, addresses });
  }
  if (part !== "email/test" || request.method !== "POST") return undefined;
  if (role === "member") return problem(403, "Only Owners and Builders send a test mail");
  const body: unknown = await request.json().catch(() => undefined);
  const managerId =
    typeof body === "object" && body !== null && "managerId" in body && typeof body.managerId === "string" ? body.managerId : undefined;
  if (managerId === undefined) return problem(400, "Send managerId");
  const sent = await settings(object, person, "testMail", { managerId, to: person.email });
  return sent instanceof Response ? sent : said(sent);
}
