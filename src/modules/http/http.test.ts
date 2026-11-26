import { noApp } from "~/modules/github/service.ts";
import { describe, expect, it } from "vitest";
import { createHttp } from "./service.ts";
import type { Auth } from "~/modules/auth/types.ts";
import { PERSON_HEADER, decodePerson } from "~/modules/protocol/service.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";

const id = "0f8fad5b-d9cb-469f-a165-70867728950e";

function app() {
  const seen: Request[] = [];
  const target = { fetch: async (request: Request) => (seen.push(request), new Response("opened")) };
  const unused = (): never => {
    throw new Error("Not used in this test");
  };
  // Signed in as Bo when the request carries his session cookie.
  const auth: Auth = {
    handle: unused,
    signedIn: async (headers) =>
      headers.get("cookie") === "session=bo" ? { userId: "user_bo", email: "Bo@Example.com", name: "Bo", sessionId: "s1" } : undefined,
    signInWays: [],
    gitHubState: unused,
    gitHubStateOf: unused,
    invitation: unused,
    accounts: unused,
    createOrganization: unused,
    deleteOrganization: unused,
    role: unused,
    organizationsOf: unused,
    isSlugTaken: unused,
    addMember: unused,
    setApprovedDomains: unused,
    organizationsApproving: unused,
    sendEmailProof: unused,
    emailProven: unused,
    userOf: unused,
    membersOf: unused,
    setRole: unused,
    removeMember: unused,
    renameOrganization: unused,
  };
  const workspaces: Workspaces = {
    create: unused,
    list: unused,
    open: unused,
    reach: unused,
    remove: unused,
    joining: unused,
    setInviteLinks: unused,
    setApprovedDomains: unused,
    joinByLink: unused,
    joinByDomain: unused,
    connectGitHub: unused,
    requestJoin: unused,
    personChanged: unused,
    linkEmail: unused,
    addHandle: unused,
    answer: unused,
    updateGeneral: unused,
    approvalFor: unused,
    exportData: unused,
    scheduleRemoval: unused,
    removeDue: unused,
  };
  const managers = { mint: unused, get: unused };
  const control = () => ({ auth, workspaces, managers, github: noApp });
  const http = createHttp({ directory: () => target, workspace: () => target, pages: async () => new Response("page"), control });
  const socket = (path: string, headers: Record<string, string> = {}) =>
    http(new Request(`https://app.test${path}`, { headers: { Upgrade: "websocket", ...headers } }));
  return { http, socket, seen };
}

describe("http", () => {
  it("serves pages and the health check", async () => {
    const { http } = app();
    expect(await (await http(new Request("https://app.test/w/x"))).text()).toBe("page");
    expect(await (await http(new Request("https://app.test/api/health"))).json()).toEqual({ ok: true });
    expect((await http(new Request("https://app.test/api/nope"))).status).toBe(404);
  });

  it("never forwards the objects' internal requests", async () => {
    const { http, socket, seen } = app();
    expect((await http(new Request("https://app.test/internal/publish", { method: "POST" }))).status).toBe(200); // a page
    expect((await socket(`/api/workspaces/${id}/internal/destroy`)).status).toBe(404);
    expect((await socket("/api/workspaces/directory/socket")).status).toBe(404);
    expect(seen).toHaveLength(0);
  });

  it("needs an upgrade and a session", async () => {
    const { http, socket } = app();
    expect((await http(new Request("https://app.test/api/directory/socket"))).status).toBe(426);
    expect((await socket("/api/directory/socket")).status).toBe(401);
  });

  it("sets the person itself from the session, replacing what a client claims", async () => {
    const { socket, seen } = app();
    await socket(`/api/workspaces/${id}/socket?name=Boss`, { cookie: "session=bo", [PERSON_HEADER]: "%7B%22id%22%3A%22ts%3Aboss%22%7D" });
    expect(decodePerson(seen[0]!.headers.get(PERSON_HEADER))).toEqual({ id: "email:bo@example.com", name: "Bo" });
  });

  it("refuses sockets opened by another site", async () => {
    const { socket } = app();
    const path = "/api/directory/socket";
    const bo = { cookie: "session=bo", Host: "app.test" };
    expect((await socket(path, { ...bo, Origin: "https://evil.test" })).status).toBe(403);
    expect((await socket(path, { ...bo, Origin: "null" })).status).toBe(403);
    expect((await socket(path, { ...bo, Origin: "https://app.test" })).status).toBe(200);
  });

  it("says who the session says you are, and nobody without one", async () => {
    const { http } = app();
    const as = async (headers: Record<string, string>) => (await http(new Request("https://app.test/api/me", { headers }))).json();
    expect(await as({ cookie: "session=bo", "Tailscale-User-Login": "boss@example.com" })).toEqual({
      person: { id: "email:bo@example.com", name: "Bo" },
    });
    expect(await as({ "Tailscale-User-Login": "boss@example.com" })).toEqual({ person: null });
  });
});
