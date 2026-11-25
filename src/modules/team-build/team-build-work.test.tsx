import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Agents, ManagerSettings, Skills, Templates } from "./service.ts";
import { basics, type Call, mgr, show, world, ws } from "./testing.tsx";

afterEach(cleanup);

const STAMP = { version: 1, savedAt: 1_000, savedBy: "Bea", note: "First" };
let AGENT = {
  id: "a1",
  config: {
    name: "Docs writer",
    instructions: "Write docs.",
    thinking: "medium",
    tools: ["bash"],
    skills: [],
    model: null,
    environment: null,
  },
  version: 1,
  versions: [STAMP],
};
const agents = (role: "owner" | "member" = "owner") => ({
  ...basics(role),
  [`GET ${ws("/agents")}`]: () => ({ agents: [AGENT], environments: [] }),
  [`GET ${ws("/skills")}`]: { skills: [] },
});
const sure = (name: string) => screen.getAllByRole("button", { name }).at(-1) as HTMLElement;

describe("agents and skills", () => {
  it("saves an agent as a new version with what changed, and asks before deleting it", async () => {
    const app = world({
      ...agents(),
      [`PUT ${ws("/agents/a1")}`]: ({ body }: Call) => {
        AGENT = { ...AGENT, config: (body as { config: typeof AGENT.config }).config, version: 2 };
        return { _tag: "Saved", value: AGENT };
      },
      [`DELETE ${ws("/agents/a1")}`]: { _tag: "Deleted" },
    });
    render(show(<Agents workspaceId="w1" itemId="a1" />, app.send));
    const words = await screen.findByRole("textbox", { name: "Instructions" });
    await userEvent.clear(words);
    await userEvent.type(words, "Write docs. Describe behaviour.");
    await userEvent.type(screen.getByRole("textbox", { name: /What changed/u }), "Behaviour rule");
    await userEvent.click(screen.getByRole("button", { name: "Save as v2" }));
    expect(await screen.findByText("Saved")).toBeTruthy();
    expect(app.called("PUT", ws("/agents/a1"))[0]?.body).toMatchObject({
      config: {
        name: "Docs writer",
        instructions: "Write docs. Describe behaviour.",
        tools: ["bash"],
        thinking: "medium",
        model: null,
        environment: null,
      },
      note: "Behaviour rule",
    });
    await userEvent.click(screen.getByRole("button", { name: "Delete agent" }));
    expect(app.called("DELETE", ws("/agents/a1"))).toHaveLength(0);
    await userEvent.click(sure("Delete agent"));
    await waitFor(() => expect(app.called("DELETE", ws("/agents/a1"))).toHaveLength(1));
    expect(app.called("DELETE", ws("/agents/a1"))[0]?.body).toEqual({ confirm: "a1" });
  });

  it("shows a member the agent and none of the ways to change it", async () => {
    render(show(<Agents workspaceId="w1" itemId="a1" />, world(agents("member")).send));
    expect(await screen.findByDisplayValue("Docs writer")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save as v2" })).toBeNull();
    expect(screen.queryByRole("link", { name: "New agent" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete agent" })).toBeNull();
  });

  it("makes a skill from a file and sends the files with its name", async () => {
    const app = world({
      ...basics(),
      [`GET ${ws("/skills")}`]: { skills: [] },
      [`POST ${ws("/skills")}`]: ({ body }: Call) => ({
        _tag: "Saved",
        value: {
          id: "s1",
          name: (body as { name: string }).name,
          files: (body as { files: object }).files,
          version: 1,
          checks: [],
          versions: [STAMP],
        },
      }),
    });
    render(show(<Skills workspaceId="w1" itemId="new" />, app.send));
    await userEvent.type(await screen.findByRole("textbox", { name: /Name/u }), "page-reader");
    await userEvent.type(screen.getByRole("textbox", { name: "New file" }), "scripts/read.js");
    await userEvent.click(screen.getByRole("button", { name: "Add file" }));
    await userEvent.click(screen.getByRole("button", { name: "Create skill" }));
    expect(await screen.findByText("Saved")).toBeTruthy();
    const sent = app.called("POST", ws("/skills"))[0]?.body as { name: string; files: Record<string, string> };
    expect(sent.name).toBe("page-reader");
    expect(Object.keys(sent.files).sort()).toEqual(["SKILL.md", "scripts/read.js"]);
  });
});

describe("templates", () => {
  const templates = {
    templates: [
      {
        id: "incident",
        name: "Incident desk",
        about: "Runs incidents.",
        opensOn: "console",
        lanes: [{ name: "Triage" }],
        fields: [{ label: "Severity" }],
      },
    ],
  };

  it("starts a manager from a template with the name it was given", async () => {
    const app = world({
      ...basics(),
      [`GET ${ws("/templates")}`]: templates,
      [`POST ${ws("/managers")}`]: { manager: { managerId: "m2" } },
    });
    render(show(<Templates workspaceId="w1" />, app.send));
    await userEvent.click(await screen.findByRole("button", { name: "Use the Incident desk template" }));
    await userEvent.type(screen.getByRole("textbox", { name: /Name/u }), "Night desk");
    await userEvent.click(screen.getByRole("button", { name: "Start manager" }));
    await screen.findByText("Incident desk");
    expect(app.called("POST", ws("/managers"))[0]?.body).toEqual({ name: "Night desk", template: "incident" });
  });

  it("keeps a member from starting one, and says why", async () => {
    render(show(<Templates workspaceId="w1" />, world({ ...basics("member"), [`GET ${ws("/templates")}`]: templates }).send));
    expect(await screen.findByText("Only Owners and Builders start a manager. You can read the templates.")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Use the Incident desk template" }).hasAttribute("disabled") ||
        screen.getByRole("button", { name: "Use the Incident desk template" }).getAttribute("aria-disabled") === "true",
    ).toBe(true);
  });
});

describe("a manager's permissions and sources", () => {
  it("sends only what changed, as the manager's own permissions action", async () => {
    const app = world({
      ...basics(),
      [`GET ${mgr("/permissions")}`]: {
        permissions: {
          categories: {},
          actions: { "reply.thread": "on" },
          template: "kanban",
          templateDefaults: { categories: {}, actions: {} },
        },
        actions: [
          { id: "reply.thread", category: "outside", label: "Reply in the thread", screen: "Task", default: "ask" },
          { id: "message.direct", category: "outside", label: "Message a person directly", screen: "Chat", default: "ask" },
        ],
        categoryDefaults: { outside: "ask" },
      },
      [`POST ${mgr("/actions/self.permissions")}`]: { _tag: "Done", value: {} },
    });
    render(show(<ManagerSettings workspaceId="w1" managerId="m1" section="permissions" />, app.send));
    await userEvent.click(await screen.findByRole("button", { name: /^Talk to the outside/u }));
    const direct = screen.getByRole("radiogroup", { name: "Message a person directly" });
    await userEvent.click(within(direct).getByRole("radio", { name: "Off" }));
    await userEvent.click(screen.getByRole("button", { name: "Save permissions" }));
    expect(await screen.findByText("Saved")).toBeTruthy();
    expect(app.called("POST", mgr("/actions/self.permissions"))[0]?.body).toEqual({
      input: { categories: {}, actions: { "message.direct": "off" } },
      requestId: "id-1",
    });
  });

  it("sends a test mail and says where it came from", async () => {
    const app = world({
      ...basics(),
      [`GET ${ws("/email")}`]: {
        ending: ".acme@co-worker.tech",
        addresses: [
          {
            managerId: "m1",
            name: "Launch",
            address: "launch.acme@co-worker.tech",
            taskAddress: "launch.acme+dt-<number>@co-worker.tech",
            how: "Our domain",
            status: "Live",
          },
        ],
      },
      [`POST ${ws("/email/test")}`]: { _tag: "Sent", from: "launch.acme@co-worker.tech" },
    });
    render(show(<ManagerSettings workspaceId="w1" managerId="m1" section="sources" source="email" />, app.send));
    expect(await screen.findByText(/Every address ends in \.acme@co-worker\.tech\./u)).toBeTruthy();
    await userEvent.click(await screen.findByRole("button", { name: "Send a test mail" }));
    expect(await screen.findByText("Test mail sent")).toBeTruthy();
    expect(app.called("POST", ws("/email/test"))[0]?.body).toEqual({ managerId: "m1" });
  });

  it("saves the repos a manager hears with their events", async () => {
    const app = world({
      ...basics(),
      [`GET ${mgr("/github")}`]: { github: { installation: { id: 7, account: "acme", repos: ["acme/web"] }, sources: [] } },
      [`GET ${ws("/github")}`]: { github: {}, installUrl: "/github/fake" },
      [`PUT ${mgr("/github")}`]: {
        _tag: "Set",
        connection: {
          installation: { id: 7, account: "acme", repos: ["acme/web"] },
          sources: [{ managerId: "m1", repo: "acme/web", events: ["issues", "issue_comment"] }],
        },
      },
    });
    render(show(<ManagerSettings workspaceId="w1" managerId="m1" section="sources" source="github" />, app.send));
    await userEvent.click(await screen.findByRole("switch", { name: "acme/web" }));
    await userEvent.click(screen.getByRole("button", { name: "Save repos" }));
    expect(await screen.findByText("Saved")).toBeTruthy();
    expect(app.called("PUT", mgr("/github"))[0]?.body).toEqual({ repos: [{ repo: "acme/web", events: ["issues", "issue_comment"] }] });
  });

  it("says on the sources page and on GitHub's own page that the App was uninstalled, and what to do", async () => {
    const lost = { account: "acme", at: 5_000, sources: [{ managerId: "m1", repo: "acme/web", events: ["issues"] }] };
    const app = world({
      ...basics(),
      [`GET ${mgr("/github")}`]: { github: { lost, sources: [] } },
      [`GET ${ws("/github")}`]: { github: {}, installUrl: "/github/fake" },
    });
    render(show(<ManagerSettings workspaceId="w1" managerId="m1" section="sources" />, app.send));
    expect(await screen.findByText("GitHub lost its connection")).toBeTruthy();
    expect(screen.getAllByText("Lost connection").length).toBeGreaterThan(0);
    expect(screen.getByText(/It was listening to acme\/web/u)).toBeTruthy();
    expect(screen.getByText("Install the App again, then choose the repos here once more.")).toBeTruthy();
    cleanup();
    render(show(<ManagerSettings workspaceId="w1" managerId="m1" section="sources" source="github" />, app.send));
    expect(await screen.findByRole("button", { name: "Connect GitHub" })).toBeTruthy();
  });
});
