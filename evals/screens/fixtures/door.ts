import type { Fixture } from "./read.ts";

/*
 * The door and everything outside a workspace, whole paths, in today's shapes (src/modules/team-join/internal/api.ts,
 * team-shell/internal/api.ts, http/internal/control.ts). `/api/join/known` and `/api/start/repos` are not there today:
 * the drawn join page says who is already in a workspace of the same mail domain, and the start page lists what GitHub shows.
 */
export const DOOR: readonly Fixture[] = [
  ["/api/me", { person: { id: "email:ama@acme.co", name: "Ama Mensah" } }],
  ["/api/sign-in", { ways: ["github", "google"] }],
  ["/api/workspaces", { workspaces: [{ workspaceId: "ws-acme", name: "Acme", address: "acme", role: "owner" }] }],
  [
    "/api/join/known",
    { workspace: { workspaceId: "ws-acme", name: "Acme", address: "acme", people: 3, managers: 6, owners: ["Ama Mensah"] } },
  ],
  ["/api/join/request", { _tag: "Requested" }],
  [
    "/api/start/repos",
    {
      repos: [
        { repo: "acme/web", about: "TypeScript. Has tests and CI." },
        { repo: "acme/api", about: "TypeScript. Has tests and CI." },
        { repo: "acme/docs", about: "Markdown. No tests." },
      ],
    },
  ],
];
