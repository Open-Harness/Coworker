import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { SideNav } from "@astryxdesign/core/SideNav";
import { BrowserProvider, createServer } from "~/modules/team-core/service.ts";
import { createJoinApi, Session } from "~/modules/team-join/service.ts";
import { afterEach, describe, expect, it } from "vitest";
import { createStartApi, CreateWorkspacePage, GettingStarted, GitHubInstalledPage, isStep, StartPage } from "./service.ts";
import type { StartPageProps } from "./types.ts";

afterEach(cleanup);

type Answers = Readonly<Record<string, unknown>>;

const MANAGER = { managerId: "m1", name: "Launch", address: "launch.acme@co-worker.tech" };
const SETTLED: Answers = {
  "GET /api/me": { person: { id: "email:ama@acme.test", name: "Ama" } },
  "GET /api/workspaces/w1": { _tag: "Opened", role: "owner", profile: { workspaceId: "w1", name: "Acme", address: "acme", region: "eu" } },
  "GET /api/workspaces/w1/managers": { managers: [MANAGER] },
  "GET /api/workspaces/w1/models": { connections: [], readiness: { _tag: "NoModel", reason: "No model is connected" } },
  "GET /api/workspaces/w1/github": { github: { sources: [] }, installUrl: "https://github.test/install" },
  "GET /api/workspaces/w1/managers/m1/github": { github: { sources: [] } },
  "GET /api/auth/organization/list-members": { members: [{ id: "x", role: "owner", user: { name: "Ama", email: "ama@acme.test" } }] },
  "GET /api/auth/organization/list-invitations": [],
  "GET /api/workspaces/w1/join": { _tag: "Settings", linksOn: false, domains: [] },
  "GET /api/workspaces/w1/inbox": { items: [] },
};

/** A server that answers from a table, and what was asked of it. */
function world(changes: Answers = {}) {
  const answers = { ...SETTLED, ...changes };
  const wrote: string[] = [];
  const went: string[] = [];
  const server = createServer(async (path, init) => {
    const line = `${init?.method ?? "GET"} ${path.split("?")[0]}`;
    if (init?.body !== undefined) wrote.push(`${line} ${String(init.body)}`);
    const answer = answers[line];
    return answer instanceof Response ? answer.clone() : Response.json(answer ?? { _tag: "requested" });
  }, "https://app.test");
  const api = createStartApi(server);
  const onGo = (address: string) => void went.push(address);
  const open = (page: ReactNode) =>
    render(
      <LayerProvider>
        <BrowserProvider browser={{ here: () => "/", goTo: (url) => went.push(`out ${url}`), newId: () => "1" }}>
          <Session api={createJoinApi(server)} isOpen={false}>
            {page}
          </Session>
        </BrowserProvider>
      </LayerProvider>,
    );
  const step = (props: Partial<StartPageProps>) =>
    open(<StartPage api={api} workspaceId="w1" step="model" only={false} onGo={onGo} {...props} />);
  return { api, wrote, went, open, step, onGo };
}

const heading = (name: string) => screen.findByRole("heading", { level: 1, name });
const press = async (name: string) => userEvent.click(await screen.findByRole("button", { name }));
const type = async (name: string, text: string) => userEvent.type(await screen.findByRole("textbox", { name }), text);

describe("making the workspace", () => {
  it("makes an address from the name, lets the company's domain join, and goes on to models", async () => {
    const { api, open, wrote, went, onGo } = world({ "POST /api/workspaces": { workspace: { workspaceId: "w1" } } });
    open(<CreateWorkspacePage api={api} hasOthers={false} onGo={onGo} />);
    await type("Name", "Acme Inc.");
    expect((await screen.findByRole<HTMLInputElement>("textbox", { name: "Address" })).value).toBe("acme-inc");
    await userEvent.click(screen.getByRole("switch", { name: /Anyone at acme.test can join/u }));
    await press("Create workspace");
    expect(wrote[0]).toBe('POST /api/workspaces {"name":"Acme Inc.","address":"acme-inc","region":"eu"}');
    expect(wrote[1]).toContain('"domains":["acme.test"]');
    expect(went).toEqual(["/start/w1/model"]);
  });

  it("offers to ask to join when the address is taken", async () => {
    const { api, open, wrote, went, onGo } = world({
      "POST /api/workspaces": Response.json({ error: "Address taken" }, { status: 409 }),
    });
    open(<CreateWorkspacePage api={api} hasOthers={false} onGo={onGo} />);
    await type("Name", "Acme");
    await press("Create workspace");
    expect(await screen.findByText("acme is taken")).toBeTruthy();
    await press("Ask to join acme");
    expect(wrote.at(-1)).toContain("acme");
    expect(went).toEqual([]);
  });

  it("says nothing about a domain anyone can have an address at", async () => {
    const { api, open, onGo } = world({ "GET /api/me": { person: { id: "email:ama@gmail.com", name: "Ama" } } });
    open(<CreateWorkspacePage api={api} hasOthers={false} onGo={onGo} />);
    await heading("Create your workspace");
    expect(screen.queryByRole("switch")).toBeNull();
  });
});

describe("the steps", () => {
  it("can skip the model", async () => {
    const { step, went } = world();
    step({ step: "model" });
    await press("Do this later");
    expect(went).toEqual(["/start/w1/manager"]);
  });

  it("carries the kind of manager into its mission, and tells the manager the mission", async () => {
    const { step, went, wrote } = world({ "POST /api/workspaces/w1/managers": { manager: MANAGER } });
    step({ step: "manager" });
    await userEvent.click(await screen.findByRole("checkbox", { name: "Incident desk" }));
    await press("Continue");
    expect(went).toEqual(["/start/w1/mission?template=incident"]);
    cleanup();
    step({ step: "mission", template: "incident" });
    await type("Mission", "Keep checkout up");
    await press("Create manager");
    expect(wrote[0]).toBe('POST /api/workspaces/w1/managers {"name":"Incidents","template":"incident","mission":"Keep checkout up"}');
    expect(wrote[1]).toContain('"text":"Keep checkout up","requestId":"mission:m1"');
    expect(went.at(-1)).toBe("/start/w1/listen?manager=m1");
  });

  it("goes to GitHub to connect it, and has nobody listen before there is a manager", async () => {
    const { step, went } = world();
    step({ step: "listen", managerId: "m1" });
    await press("Connect GitHub");
    expect(went).toEqual(["out https://github.test/install"]);
    cleanup();
    world({ "GET /api/workspaces/w1/managers": { managers: [] } }).step({ step: "listen" });
    expect(await heading("What should your first manager do?")).toBeTruthy();
  });

  it("invites everyone named, and refuses what is not an address", async () => {
    const { step, went, wrote } = world();
    step({ step: "invite", managerId: "m1" });
    await type("Emails", "bo@acme.test, nope");
    expect((await screen.findAllByText("Not an email address: nope")).length).toBeGreaterThan(0);
    await userEvent.clear(screen.getByRole("textbox", { name: "Emails" }));
    await type("Emails", "bo@acme.test cy@acme.test");
    await press("Send invites and finish");
    expect(wrote.map((line) => /"email":"([^"]+)"/u.exec(line)?.[1])).toEqual(["bo@acme.test", "cy@acme.test"]);
    expect(went).toEqual(["/ws/w1/m/m1/chat"]);
  });

  it("ends in the workspace when it is opened by itself", async () => {
    const { step, went } = world();
    step({ step: "model", only: true, managerId: "m1" });
    expect(await screen.findByRole("link", { name: "Back to Acme" })).toBeTruthy();
    await press("Do this later");
    expect(went).toEqual(["/ws/w1/m/m1/chat"]);
    expect(isStep("model") && !isStep("workspace")).toBe(true);
  });
});

describe("coming back from GitHub", () => {
  it("connects only when asked to, and goes back to the manager it was opened for", async () => {
    const { api, open, wrote, went, onGo } = world();
    open(<GitHubInstalledPage api={api} state="w1~m1~proof" code="c1" installationId={7} onGo={onGo} />);
    await heading("Connect GitHub to Acme");
    expect(wrote).toEqual([]);
    await press("Connect");
    expect(wrote).toEqual(['POST /api/workspaces/w1/github {"installationId":7,"code":"c1","state":"w1~m1~proof"}']);
    expect(went).toEqual(["/start/w1/listen?manager=m1"]);
  });

  it("has nothing to connect without an installation", async () => {
    const { api, open, onGo } = world();
    open(<GitHubInstalledPage api={api} state="w1~~proof" code="c1" installationId={undefined} onGo={onGo} />);
    expect(await heading("Nothing to connect")).toBeTruthy();
  });
});

describe("Getting started", () => {
  const show = (changes: Answers = {}) => {
    const { api, open } = world(changes);
    open(
      <SideNav>
        <GettingStarted api={api} workspaceId="w1" path="/ws/w1/inbox" />
      </SideNav>,
    );
    return api;
  };

  it("counts what is done, and links to what is not", async () => {
    show();
    expect(await screen.findByText("Getting started · 2 of 6")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Connect a model" }).getAttribute("href")).toBe("/start/w1/model?manager=m1&only=1");
    expect(screen.queryByRole("link", { name: "Make a manager" })).toBeNull();
  });

  it("goes away once everything is done; asking to join is not a manager's question", async () => {
    const join = { kind: "question", managerId: "", answer: { text: "Let them in" } };
    const done: Answers = {
      "GET /api/workspaces/w1/models": { connections: [], readiness: { _tag: "Ready" } },
      "GET /api/workspaces/w1/github": { github: { installation: { account: "acme", repos: ["acme/web"] }, sources: [] } },
      "GET /api/workspaces/w1/join": { _tag: "Settings", linksOn: true, domains: [], linkPath: "/join/link/w1/s" },
    };
    const almost = show({ ...done, "GET /api/workspaces/w1/inbox": { items: [join] } });
    expect(await screen.findByText("Getting started · 5 of 6")).toBeTruthy();
    expect((await almost.progress("w1"))._tag).toBe("Loaded");
    cleanup();
    const all = show({ ...done, "GET /api/workspaces/w1/inbox": { items: [join, { ...join, managerId: "m1" }] } });
    const progress = await all.progress("w1");
    expect(progress._tag === "Loaded" && progress.value.every(({ isDone }) => isDone)).toBe(true);
    expect(screen.queryByText(/Getting started/u)).toBeNull();
  });
});
