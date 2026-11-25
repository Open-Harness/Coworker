import type { ApprovalRequest, PermissionSet } from "~/modules/actions/types.ts";
import type { SignedIn } from "~/modules/auth/types.ts";
import { isTemplate } from "~/modules/manager/service.ts";
import type { ManagerApi, ManagerObjects } from "~/modules/manager/types.ts";
import { personOf } from "~/modules/protocol/service.ts";
import { triggers } from "~/modules/triggers/service.ts";
import { routeRepoSources } from "./github.ts";
import { callSettings } from "~/modules/settings/service.ts";
import type { Page } from "~/modules/access/types.ts";
import { by, closed, mayDo, ownOf, settingOf } from "./kit.ts";
import type { Preset } from "~/modules/auth/types.ts";
import type { WorkspaceApi } from "~/modules/workspace/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";

/** `/api/workspaces/<id>/managers[/<managerId>[/chat|/pages|/policy|/events|/github|/runs/<runId>|/actions/<actionId>]]`. */
export const MANAGERS =
  /^\/api\/workspaces\/([A-Za-z0-9_-]{8,64})\/managers(?:\/([A-Za-z0-9_-]{4,64})(\/chat|\/pages|\/policy|\/events|\/github|\/runs\/[a-z0-9-]{1,40}|\/actions\/[a-z]+\.[a-z]+)?)?$/u;

const STATUS = { AddressTaken: 409, InvalidAddress: 400, Failed: 502, NotProvisioned: 404, NoModel: 503 } as const;
const problem = (status: number, message: string): Response => Response.json({ error: message }, { status });
const answer = (result: unknown, ok = 200): Response => {
  const tag = typeof result === "object" && result !== null && "_tag" in result ? String(result._tag) : "";
  const status = STATUS[tag as keyof typeof STATUS] ?? ok;
  return Response.json(result, { status, headers: { "Cache-Control": "no-store" } });
};
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null;
const text = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

async function create(workspace: WorkspaceApi, person: SignedIn, role: Preset, request: Request): Promise<Response> {
  if (!mayDo(person, role, await ownOf(workspace, person), "manager.create")) return problem(403, "Your role cannot create managers");
  const body: unknown = await request.json().catch(() => undefined);
  if (!isRecord(body) || typeof body["name"] !== "string" || !isTemplate(body["template"])) {
    return problem(400, "Send a name and a template (kanban, incident, support or research)");
  }
  const slug = text(body["address"]);
  const mission = text(body["mission"]);
  const input = {
    name: body["name"],
    template: body["template"],
    createdBy: personOf(person).id,
    ...(slug === undefined ? {} : { slug }),
    ...(mission === undefined ? {} : { mission }),
  };
  return answer(await workspace.createManager(input), 201);
}

/** A button: the action the manager's tool of the same id runs, checked against the person's preset and own changes. */
async function act(
  manager: ManagerApi,
  person: SignedIn,
  role: Preset,
  own: PermissionSet,
  request: Request,
  actionId: string,
  askOwners: (call: Omit<ApprovalRequest, "managerId">) => Promise<{ readonly _tag: string }>,
): Promise<Response> {
  if (request.method !== "POST") return problem(405, "Use POST");
  const body: unknown = await request.json().catch(() => undefined);
  const requestId = isRecord(body) ? text(body["requestId"]) : undefined;
  const input = isRecord(body) && isRecord(body["input"]) ? body["input"] : {};
  if (requestId === undefined) return problem(400, "Send input and a requestId");
  const result = await manager.act({ actionId, input, by: personOf(person), preset: role, own, requestId });
  // A press whose setting is ask waits for an Owner: it goes to their Inbox, and the person is told it is waiting.
  if (result._tag === "Ask") {
    const asked = await askOwners({ requestId, actionId, input, by: personOf(person), preset: role, sentence: result.sentence });
    return Response.json({ ...result, waiting: asked._tag !== "Failed" }, { status: 202 });
  }
  const status = result._tag === "Refused" ? 403 : result._tag === "Unknown" ? 404 : result._tag === "Done" ? 200 : 409;
  return Response.json(result, { status });
}

async function chat(manager: ManagerApi, person: SignedIn, request: Request): Promise<Response> {
  if (request.method === "GET") return answer(await manager.conversation());
  if (request.method !== "POST") return problem(405, "Use GET or POST");
  const body: unknown = await request.json().catch(() => undefined);
  const message = isRecord(body) ? text(body["text"])?.trim() : undefined;
  const requestId = isRecord(body) ? text(body["requestId"]) : undefined;
  if (message === undefined || message === "" || requestId === undefined) return problem(400, "Send text and a requestId");
  return answer(await manager.chat({ text: message, by: personOf(person), requestId }), 202);
}

/** Whether the manager can answer, for the pages that talk to it. Only an Owner can connect a model, so only they are told to. */
async function modelOf(workspace: WorkspaceApi, role: Preset) {
  const readiness = await workspace.modelReadiness();
  return readiness._tag === "Ready" ? { ready: true } : { ready: false, reason: readiness.reason, canFix: role === "owner" };
}

/** The pages, and whether this person may edit the mission and the pages under it: on, ask (an Owner approves) or off. */
async function pages(manager: ManagerApi, workspace: WorkspaceApi, person: SignedIn, role: Preset): Promise<Response> {
  const own = await ownOf(workspace, person);
  const can = { mission: settingOf(person, role, own, "mission.update"), page: settingOf(person, role, own, "page.update") };
  return answer({ pages: await manager.pages(), can });
}

/** Who may ask this manager for work, and what happens to strangers. Changing it is `allow.add` for a person. */
async function policy(workspace: WorkspaceApi, managerId: string, person: SignedIn, role: Preset, request: Request): Promise<Response> {
  if (request.method === "GET") return answer({ policy: await workspace.policy(managerId) });
  if (request.method !== "PUT") return problem(405, "Use GET or PUT");
  if (!mayDo(person, role, await ownOf(workspace, person), "allow.add")) return problem(403, "Your role cannot change who may ask");
  const body: unknown = await request.json().catch(() => undefined);
  const before = await workspace.policy(managerId);
  const after = await workspace.setPolicy(managerId, triggers.policyOf(body));
  await callSettings(workspace, "policyChanged", { managerId, before, after }, by(person));
  return answer({ policy: after });
}

/** The page whose data a request reads, so that a person who may not open the page is refused its data too. */
function pageOf(part: string | undefined, method: string): Page | undefined {
  if (part === undefined) return method === "GET" ? "board" : undefined;
  if (part === "/chat") return "chat";
  if (part === "/pages") return "mission";
  if (part === "/events") return "events";
  if (part.startsWith("/runs/")) return "run";
  if (method !== "GET") return undefined;
  return part === "/policy" || part === "/github" ? "manager-settings" : undefined;
}

export async function routeManagers(
  workspaces: Workspaces,
  managers: ManagerObjects,
  person: SignedIn,
  request: Request,
  match: RegExpExecArray,
): Promise<Response> {
  const [, workspaceId = "", managerId, part] = match;
  const reached = await workspaces.reach(person.userId, workspaceId, "member");
  if (reached._tag !== "Reached") return problem(404, "No such workspace");
  if (managerId === undefined) {
    if (request.method === "GET") return answer({ managers: await reached.object.managers() });
    if (request.method === "POST") return create(reached.object, person, reached.role, request);
    return problem(405, "Use GET or POST");
  }
  const entry = (await reached.object.managers()).find((manager) => manager.managerId === managerId);
  if (entry === undefined) return problem(404, "No such manager");
  const manager = managers.get(entry.objectId, entry.region);
  const page = pageOf(part, request.method);
  const refused = page === undefined ? undefined : await closed(reached.object, person, reached.role, page);
  if (refused !== undefined) return refused;
  if (part === "/chat") return chat(manager, person, request);
  if (part === "/policy") return policy(reached.object, managerId, person, reached.role, request);
  if (part === "/github") {
    if (request.method !== "GET" && !mayDo(person, reached.role, await ownOf(reached.object, person), "source.add"))
      return problem(403, "Your role cannot add sources");
    return routeRepoSources(reached.object, managerId, entry.template, request);
  }
  if (part?.startsWith("/actions/") === true) {
    const own = await ownOf(reached.object, person);
    const ask = (call: Omit<ApprovalRequest, "managerId">) => workspaces.approvalFor(person.userId, workspaceId, { ...call, managerId });
    return act(manager, person, reached.role, own, request, part.slice("/actions/".length), ask);
  }
  if (request.method !== "GET") return problem(405, "Use GET");
  if (part === "/pages") return pages(manager, reached.object, person, reached.role);
  if (part === "/events") {
    // What the Workspace heard, with what the manager decided about each: a candidate that became a Task names it.
    const [heard, decided] = await Promise.all([reached.object.events(managerId, 200), manager.decisions()]);
    const decisions = new Map(decided.map((decision) => [decision.trigger, decision]));
    return answer({
      events: heard.map((event) => {
        const decision = event.trigger === undefined ? undefined : decisions.get(event.trigger);
        return decision === undefined ? event : { ...event, decision };
      }),
    });
  }
  if (part?.startsWith("/runs/") === true) {
    const run = await manager.run(part.slice("/runs/".length));
    return run._tag === "NoSuchRun" ? problem(404, "No such run") : answer(run);
  }
  return answer({ manager: entry, board: await manager.board(), model: await modelOf(reached.object, reached.role) });
}
