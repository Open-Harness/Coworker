import type { Auth, SignedIn } from "~/modules/auth/types.ts";
import { github } from "~/modules/github/service.ts";
import type { GitHubApi } from "~/modules/github/types.ts";
import type { WorkspaceApi } from "~/modules/workspace/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";
import { closed } from "./kit.ts";

/** `/api/workspaces/<id>/github`: the workspace's installation of the App. */
export const GITHUB = /^\/api\/workspaces\/([A-Za-z0-9_-]{8,64})\/github$/u;

const STATUS = { NotMember: 404, NotOwner: 403, Taken: 409, Failed: 502, NotConnected: 409, NotReachable: 400 } as const;
const problem = (status: number, message: string): Response => Response.json({ error: message }, { status });
const answer = (result: object): Response => {
  const tag = "_tag" in result ? String(result._tag) : "";
  return Response.json(result, { status: STATUS[tag as keyof typeof STATUS] ?? 200, headers: { "Cache-Control": "no-store" } });
};
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null;

const WHY = {
  NotSignedIn: "GitHub did not say who you are. Start again from Keys and connections.",
  NotYours: "Only someone who administers every repo of that installation can connect it.",
} as const;

/** What GitHub's install page brings back: the workspace, the manager it was opened for, and the proof of both. */
const stateFor = async (auth: Auth, person: SignedIn, workspaceId: string, manager: string): Promise<string> =>
  `${workspaceId}~${manager}~${await auth.gitHubState(person, `${workspaceId}~${manager}`)}`;

async function opened(auth: Auth, person: SignedIn, workspaceId: string, state: string): Promise<boolean> {
  const [workspace = "", manager = "", token = ""] = state.split("~");
  return workspace === workspaceId && (await auth.gitHubStateOf(person, token)) === `${workspace}~${manager}`;
}

/**
 * GET shows the connection, and GitHub's install page for this person. POST `{installationId, code, state}` claims an
 * installation after that page sent the Owner back: `state` proves they opened it for this workspace within the hour,
 * and `code` proves to GitHub who they are, so nobody connects someone else's repos by naming their installation.
 */
export async function routeGitHub(
  { auth, workspaces, github: api }: { readonly auth: Auth; readonly workspaces: Workspaces; readonly github: GitHubApi },
  person: SignedIn,
  request: Request,
  workspaceId: string,
): Promise<Response> {
  if (request.method === "GET") {
    const reached = await workspaces.reach(person.userId, workspaceId, "member");
    if (reached._tag !== "Reached") return problem(404, "No such workspace");
    // A manager's Sources and the Owner's connections show it.
    const refused = await closed(reached.object, person, reached.role, "manager-settings");
    if (refused !== undefined) return refused;
    const manager = new URL(request.url).searchParams.get("manager") ?? "";
    const installUrl = api.installUrl(await stateFor(auth, person, workspaceId, /^[A-Za-z0-9_-]{0,64}$/u.test(manager) ? manager : ""));
    return answer({ github: await reached.object.gitHub(), ...(installUrl === undefined ? {} : { installUrl }) });
  }
  if (request.method !== "POST") return problem(405, "Use GET or POST");
  const reached = await workspaces.reach(person.userId, workspaceId, "settings");
  if (reached._tag !== "Reached") return answer(reached);
  const body: unknown = await request.json().catch(() => undefined);
  const { installationId: id, code, state } = isRecord(body) ? body : {};
  if (typeof id !== "number" || !Number.isSafeInteger(id)) return problem(400, "Send the installationId GitHub gave you");
  if (typeof code !== "string" || code === "") return problem(400, WHY.NotSignedIn);
  if (typeof state !== "string" || !(await opened(auth, person, workspaceId, state))) return problem(400, WHY.NotSignedIn);
  const claim = await api.claim(id, code);
  if (claim._tag !== "Claimed") return problem(claim._tag === "NotYours" ? 403 : 400, WHY[claim._tag]);
  return answer(await workspaces.connectGitHub(person.userId, workspaceId, claim.installation));
}

/**
 * PUT `{repos: [{repo, events?}]}`: what this manager hears. A repo sent without events gets the template's
 * starting set.
 */
export async function routeRepoSources(workspace: WorkspaceApi, managerId: string, template: string, request: Request): Promise<Response> {
  if (request.method === "GET") {
    const [connection, lost] = [await workspace.gitHub(), await workspace.gitHubLost()];
    return answer({ github: lost === undefined || connection.installation !== undefined ? connection : { ...connection, lost } });
  }
  if (request.method !== "PUT") return problem(405, "Use GET or PUT");
  const body: unknown = await request.json().catch(() => undefined);
  const repos = isRecord(body) && Array.isArray(body["repos"]) ? body["repos"].filter(isRecord) : undefined;
  if (repos === undefined || repos.some((entry) => typeof entry["repo"] !== "string")) return problem(400, "Send repos: [{repo, events?}]");
  const sources = repos.map((entry) => ({
    repo: String(entry["repo"]),
    events: entry["events"] === undefined ? github.startingEvents(template) : github.eventsOf(entry["events"]),
  }));
  return answer(await workspace.setRepoSources(managerId, sources));
}
