import { noApp } from "~/modules/github/service.ts";
import { describe, expect, it } from "vitest";
import { createHttp } from "./service.ts";
import type { Auth } from "~/modules/auth/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";

const id = "0f8fad5b-d9cb-469f-a165-70867728950e";

function app() {
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
  const control = () => ({ auth, workspaces, github: noApp });
  const http = createHttp({ pages: async () => new Response("page"), control });
  return { http };
}

describe("http", () => {
  it("serves pages and the health check", async () => {
    const { http } = app();
    expect(await (await http(new Request("https://app.test/w/x"))).text()).toBe("page");
    expect(await (await http(new Request("https://app.test/api/health"))).json()).toEqual({ ok: true });
    expect((await http(new Request("https://app.test/api/nope"))).status).toBe(404);
  });

  it("answers no socket: the first product's chat objects are gone", async () => {
    const { http } = app();
    expect((await http(new Request("https://app.test/api/directory/socket", { headers: { Upgrade: "websocket" } }))).status).toBe(404);
    expect((await http(new Request(`https://app.test/api/workspaces/${id}/socket`, { headers: { Upgrade: "websocket" } }))).status).toBe(
      404,
    );
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
