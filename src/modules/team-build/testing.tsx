import type { ReactNode } from "react";
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { BrowserProvider, createServer, ServerProvider } from "~/modules/team-core/service.ts";

/** One request the screens made. */
export interface Call {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}

/** What a route answers: a body (200), or a status with its body. */
export type Answer = unknown | { readonly status: number; readonly json: unknown } | ((call: Call) => unknown);

const isStatus = (value: unknown): value is { readonly status: number; readonly json: unknown } =>
  typeof value === "object" && value !== null && "status" in value && "json" in value;

/**
 * A server in memory: routes are `"METHOD /path"` (the query left off). An answer that is a function sees the call.
 * A route nobody listed is a 404, so a screen that asks for something unexpected fails where it asks.
 */
export function world(routes: Readonly<Record<string, Answer>>) {
  const calls: Call[] = [];
  const send = async (path: string, init?: RequestInit): Promise<Response> => {
    const call: Call = {
      method: init?.method ?? "GET",
      path: path.split("?")[0] ?? path,
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    };
    calls.push(call);
    const answer = routes[`${call.method} ${call.path}`];
    if (answer === undefined) return Response.json({ error: `Nothing at ${call.method} ${call.path}` }, { status: 404 });
    const given = typeof answer === "function" ? (answer as (call: Call) => unknown)(call) : answer;
    return isStatus(given) ? Response.json(given.json, { status: given.status }) : Response.json(given);
  };
  return { calls, send, called: (method: string, path: string) => calls.filter((call) => call.method === method && call.path === path) };
}

/** A screen as the app draws it: in a router, with the line to the server and what the browser does. Render the result. */
export function show(ui: ReactNode, send: (path: string, init?: RequestInit) => Promise<Response>) {
  const root = createRootRoute({ component: () => ui });
  const router = createRouter({ routeTree: root, history: createMemoryHistory({ initialEntries: ["/"] }) });
  let ids = 0;
  return (
    <LayerProvider>
      <BrowserProvider browser={{ here: () => "/", goTo: () => undefined, newId: () => `id-${(ids += 1)}` }}>
        <ServerProvider server={createServer(send)}>
          <RouterProvider router={router} />
        </ServerProvider>
      </BrowserProvider>
    </LayerProvider>
  );
}

const W = "/api/workspaces/w1";
export const ws = (path = ""): string => `${W}${path}`;
export const mgr = (path = ""): string => `${W}/managers/m1${path}`;

/** What every manager screen asks first: who the person is, and the manager's board. */
export const basics = (role: "owner" | "builder" | "member" = "owner"): Record<string, Answer> => ({
  [`GET ${ws("/general")}`]: { general: { choices: [{ connectionId: "c1", label: "Anthropic", models: ["claude-test"] }] }, role },
  [`GET ${mgr()}`]: {
    manager: { managerId: "m1", name: "Launch", address: "launch@acme.test", template: "kanban" },
    board: {
      lanes: [
        { id: "todo", name: "To do", meaning: "Not started", needsApproval: false },
        { id: "done", name: "Done", meaning: "Shipped", needsApproval: false },
      ],
      fields: [{ key: "priority", label: "Priority", type: "select", options: [{ value: "high" }, { value: "low" }] }],
      defaultView: "kanban",
      tasks: [],
    },
  },
});
