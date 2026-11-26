import { personOf } from "~/modules/protocol/service.ts";
import type { Person } from "~/modules/protocol/types.ts";
import { type Control, routeControl } from "./internal/control.ts";
import { routeWs, WS } from "./internal/ws.ts";
import type { CreateHttp, HttpDependencies } from "./types.ts";

const problem = (status: number, message: string): Response => Response.json({ error: message }, { status });

/** The signed-in person, from the Better Auth session cookie. Nothing else says who someone is. */
async function signedInPerson(control: () => Control, request: Request): Promise<Person | undefined> {
  const signedIn = await control().auth.signedIn(request.headers);
  return signedIn === undefined ? undefined : personOf(signedIn);
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
  const ws = WS.exec(pathname);
  if (ws !== null && dependencies.console !== undefined) return routeWs(dependencies.control(), dependencies.console, request, ws);
  const control = await routeControl(dependencies.control, request, pathname);
  if (control !== undefined) return control;
  return problem(404, "Not found");
};
