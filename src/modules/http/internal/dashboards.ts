import { dashboards } from "~/modules/dashboards/service.ts";
import type { ManagerFacts } from "~/modules/dashboards/types.ts";
import type { SignedIn } from "~/modules/auth/types.ts";
import type { ManagerApi, ManagerObjects } from "~/modules/manager/types.ts";
import { personOf } from "~/modules/protocol/service.ts";
import type { ManagerEntry, WorkspaceApi } from "~/modules/workspace/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";
import { closed, fresh, mayDo, ownOf, problem } from "./kit.ts";

/**
 * `GET /api/workspaces/<id>/home` and `GET /api/workspaces/<id>/managers/<managerId>/overview`: the numbers behind Home
 * and a manager's Overview. Any member may ask for Home; what they see of tasks follows `board.read` and `task.read`, and of the
 * mission `mission.read`, as the board and the mission page do. Overview is refused as its page is (the `access` module). Read-only, small, no transcript.
 */
export const HOME = /^\/api\/workspaces\/([A-Za-z0-9_-]{8,64})\/home$/u;
export const OVERVIEW = /^\/api\/workspaces\/([A-Za-z0-9_-]{8,64})\/managers\/([A-Za-z0-9_-]{4,64})\/overview$/u;

/** The most heard lines read per manager: the thirty days a dashboard shows fit well within it. */
const HEARD = 1_000;

async function factsOf(object: WorkspaceApi, managers: ManagerObjects, entry: ManagerEntry): Promise<ManagerFacts | undefined> {
  const manager: ManagerApi = managers.get(entry.objectId, entry.region);
  const [progress, decisions, events] = await Promise.all([manager.progress(), manager.decisions(), object.events(entry.managerId, HEARD)]);
  return "_tag" in progress ? undefined : { managerId: entry.managerId, name: entry.name, progress, decisions, events };
}

export async function routeHome(
  workspaces: Workspaces,
  managers: ManagerObjects,
  person: SignedIn,
  request: Request,
  workspaceId: string,
  now: number,
): Promise<Response> {
  if (request.method !== "GET") return problem(405, "Use GET");
  const reached = await workspaces.reach(person.userId, workspaceId, "member");
  if (reached._tag !== "Reached") return problem(404, "No such workspace");
  const { object, role } = reached;
  const [entries, inbox, own] = await Promise.all([object.managers(), object.inbox(personOf(person).id), ownOf(object, person)]);
  const found = await Promise.all(entries.map((entry) => factsOf(object, managers, entry)));
  return fresh(
    dashboards.home({
      now,
      managers: found.flatMap((facts) => (facts === undefined ? [] : [facts])),
      inbox,
      canSeeTasks: mayDo(person, role, own, "board.read") && mayDo(person, role, own, "task.read"),
    }),
  );
}

export async function routeOverview(
  workspaces: Workspaces,
  managers: ManagerObjects,
  person: SignedIn,
  request: Request,
  workspaceId: string,
  managerId: string,
  now: number,
): Promise<Response> {
  if (request.method !== "GET") return problem(405, "Use GET");
  const reached = await workspaces.reach(person.userId, workspaceId, "member");
  if (reached._tag !== "Reached") return problem(404, "No such workspace");
  const { object, role } = reached;
  const entry = (await object.managers()).find((one) => one.managerId === managerId);
  if (entry === undefined) return problem(404, "No such manager");
  const refused = await closed(object, person, role, "overview");
  if (refused !== undefined) return refused;
  const own = await ownOf(object, person);
  const manager = await factsOf(object, managers, entry);
  if (manager === undefined) return problem(404, "No such manager");
  const pages = mayDo(person, role, own, "mission.read") ? await managers.get(entry.objectId, entry.region).pages() : [];
  const mission = Array.isArray(pages) ? (pages.find(({ parent }) => parent === null)?.body ?? "") : "";
  return fresh(dashboards.overview({ now, manager, mission: dashboards.missionLine(mission) }));
}
