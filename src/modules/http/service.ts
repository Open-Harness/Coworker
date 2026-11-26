import { encodePerson, PERSON_HEADER, personOf } from "~/modules/protocol/service.ts";
import type { Person } from "~/modules/protocol/types.ts";
import { type Control, routeControl } from "./internal/control.ts";
import { isSameOrigin } from "./internal/origin.ts";
import { routeWs, WS } from "./internal/ws.ts";
import type { CreateHttp, HttpDependencies } from "./types.ts";

const WORKSPACE_SOCKET = /^\/api\/workspaces\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\/socket$/u;
const problem = (status: number, message: string): Response => Response.json({ error: message }, { status });

const asPerson = (request: Request, person: Person): Request => {
  const headers = new Headers(request.headers);
  headers.set(PERSON_HEADER, encodePerson(person));
  return new Request(request, { headers });
};

/** The signed-in person, from the Better Auth session cookie. Nothing else says who someone is. */
async function signedInPerson(control: () => Control, request: Request): Promise<Person | undefined> {
  const signedIn = await control().auth.signedIn(request.headers);
  return signedIn === undefined ? undefined : personOf(signedIn);
}

async function openSocket(
  request: Request,
  target: (dependencies: HttpDependencies) => ReturnType<HttpDependencies["directory"]>,
  dependencies: HttpDependencies,
): Promise<Response> {
  if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return problem(426, "A WebSocket is required");
  if (!isSameOrigin(request)) return problem(403, "The socket was opened by another site");
  const person = await signedInPerson(dependencies.control, request);
  if (person === undefined) return problem(401, "Sign in first");
  return target(dependencies).fetch(asPerson(request, person));
}

/** Who the server takes this browser for. `null` asks the page to sign in. */
async function me(dependencies: HttpDependencies, request: Request): Promise<Response> {
  const person = (await signedInPerson(dependencies.control, request)) ?? null;
  return Response.json({ person }, { headers: { "Cache-Control": "no-store" } });
}

export const createHttp: CreateHttp = (dependencies) => async (request) => {
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith("/api/")) return dependencies.pages(request);
  if (pathname === "/api/health") return Response.json({ ok: true });
  if (pathname === "/api/me") return me(dependencies, request);
  if (pathname === "/api/directory/socket") return openSocket(request, ({ directory }) => directory(), dependencies);
  const ws = WS.exec(pathname);
  if (ws !== null && dependencies.console !== undefined) return routeWs(dependencies.control(), dependencies.console, request, ws);
  const control = await routeControl(dependencies.control, request, pathname);
  if (control !== undefined) return control;
  const workspaceId = WORKSPACE_SOCKET.exec(pathname)?.[1];
  return workspaceId === undefined
    ? problem(404, "Not found")
    : openSocket(request, ({ workspace }) => workspace(workspaceId), dependencies);
};
