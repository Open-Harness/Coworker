import type { Auth, SignedIn } from "~/modules/auth/types.ts";
import type { Region } from "~/modules/workspace/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";
import type { ManagerObjects } from "~/modules/manager/types.ts";
import type { GitHubApi } from "~/modules/github/types.ts";
import { GITHUB, routeGitHub } from "./github.ts";
import { openProof, PEOPLE, PROOF_LINK, routePeople } from "./people.ts";
import { routeSandboxes, SANDBOXES } from "./sandboxes.ts";
import { BILLING, routeBilling } from "./billing.ts";
import { INBOX, routeInbox } from "./inbox.ts";
import { DOORSTEP, JOINING, routeDoorstep, routeJoining } from "./join.ts";
import { HOME, OVERVIEW, routeHome, routeOverview } from "./dashboards.ts";
import { MANAGERS, routeManagers } from "./managers.ts";
import { routeSearch, SEARCH } from "./search.ts";
import { MODELS, routeModels } from "./models.ts";
import { isSameOrigin } from "./origin.ts";
import { routeSettings, SETTINGS } from "./settings.ts";
import { MANAGER_SETTINGS, routeManagerSettings } from "./settings-manager.ts";

/** The control plane the HTTP layer answers for: sign-in and workspaces. */
export interface Control {
  readonly auth: Auth;
  readonly workspaces: Workspaces;
  readonly managers: ManagerObjects;
  readonly github: GitHubApi;
}

/** Workspace ids are Better Auth organization ids. */
const WORKSPACE = /^\/api\/workspaces\/([A-Za-z0-9_-]{8,64})$/u;
const problem = (status: number, message: string): Response => Response.json({ error: message }, { status });
const STATUS = { AddressTaken: 409, InvalidAddress: 400, Failed: 502, NotMember: 404, NotOwner: 403 } as const;
const answer = (result: { readonly _tag: string }, ok = 200): Response => {
  const status = STATUS[result._tag as keyof typeof STATUS] ?? ok;
  return Response.json(result, { status, headers: { "Cache-Control": "no-store" } });
};

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null;
const isRegion = (value: unknown): value is Region => value === "eu" || value === "us";

async function create({ workspaces }: Control, person: SignedIn, request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => undefined);
  if (!isRecord(body) || typeof body["address"] !== "string" || !isRegion(body["region"])) {
    return problem(400, "Send an address and a region (eu or us)");
  }
  const name = typeof body["name"] === "string" ? body["name"] : "";
  return answer(await workspaces.create({ userId: person.userId, name, address: body["address"], region: body["region"] }), 201);
}

async function workspaceRoutes(control: Control, person: SignedIn, request: Request, pathname: string): Promise<Response> {
  if (pathname === "/api/workspaces") {
    if (request.method === "GET") return Response.json({ workspaces: await control.workspaces.list(person.userId) });
    if (request.method === "POST") return create(control, person, request);
    return problem(405, "Use GET or POST");
  }
  const managerScreen = MANAGER_SETTINGS.exec(pathname);
  if (managerScreen !== null) return routeManagerSettings(control.workspaces, control.managers, person, request, managerScreen);
  const settings = SETTINGS.exec(pathname);
  if (settings !== null) {
    const routed = await routeSettings(control.auth, control.workspaces, person, request, settings);
    if (routed !== undefined) return routed;
  }
  if (JOINING.test(pathname)) return routeJoining(control.workspaces, person, request, pathname);
  const inbox = INBOX.exec(pathname);
  if (inbox !== null) return routeInbox(control.workspaces, person, request, inbox);
  const searched = SEARCH.exec(pathname)?.[1];
  if (searched !== undefined) return routeSearch(control.auth, control.workspaces, control.managers, person, request, searched);
  const home = HOME.exec(pathname);
  if (home !== null) return routeHome(control.workspaces, control.managers, person, request, home[1] ?? "", Date.now());
  const overview = OVERVIEW.exec(pathname);
  if (overview !== null)
    return routeOverview(control.workspaces, control.managers, person, request, overview[1] ?? "", overview[2] ?? "", Date.now());
  const managers = MANAGERS.exec(pathname);
  if (managers !== null) return routeManagers(control.workspaces, control.managers, person, request, managers);
  const people = PEOPLE.exec(pathname);
  if (people !== null) return routePeople(control.auth, control.workspaces, person, request, people);
  const billing = BILLING.exec(pathname);
  if (billing !== null) return routeBilling(control.workspaces, person, request, billing);
  const sandboxes = SANDBOXES.exec(pathname);
  if (sandboxes !== null) return routeSandboxes(control.workspaces, person, request, sandboxes);
  const github = GITHUB.exec(pathname)?.[1];
  if (github !== undefined) return routeGitHub(control, person, request, github);
  const models = MODELS.exec(pathname);
  if (models?.[1] !== undefined) return routeModels(control.workspaces, person, request, models[1], models[2] !== undefined);
  const workspaceId = WORKSPACE.exec(pathname)?.[1];
  if (workspaceId === undefined) return problem(404, "Not found");
  if (request.method === "GET") return answer(await control.workspaces.open(person.userId, workspaceId));
  if (request.method === "DELETE") return answer(await control.workspaces.remove(person.userId, workspaceId));
  return problem(405, "Use GET or DELETE");
}

/** `/api/auth/*` and `/api/workspaces[/<id>]`, or undefined when the path is neither. */
export async function routeControl(control: () => Control, request: Request, pathname: string): Promise<Response | undefined> {
  if (pathname.startsWith("/api/auth/")) return control().auth.handle(request);
  const doorstep = DOORSTEP.exec(pathname);
  if (doorstep !== null) return routeDoorstep(control().auth, request, doorstep[1]);
  const proof = PROOF_LINK.test(pathname) ? openProof(request) : undefined;
  if (proof !== undefined) return proof;
  if (
    pathname !== "/api/workspaces" &&
    !WORKSPACE.test(pathname) &&
    !MODELS.test(pathname) &&
    !JOINING.test(pathname) &&
    !MANAGERS.test(pathname) &&
    !HOME.test(pathname) &&
    !OVERVIEW.test(pathname) &&
    !SEARCH.test(pathname) &&
    !GITHUB.test(pathname) &&
    !PEOPLE.test(pathname) &&
    !SANDBOXES.test(pathname) &&
    !BILLING.test(pathname) &&
    !SETTINGS.test(pathname) &&
    !MANAGER_SETTINGS.test(pathname) &&
    !INBOX.test(pathname)
  ) {
    return undefined;
  }
  if (request.method !== "GET" && !isSameOrigin(request)) return problem(403, "Sent by another site");
  const resolved = control();
  const person = await resolved.auth.signedIn(request.headers);
  if (person === undefined) return problem(401, "Sign in first");
  return workspaceRoutes(resolved, person, request, pathname);
}
