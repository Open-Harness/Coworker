import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { known, open, sentTo, type ServerSocket, snapshot, socketTo } from "../../../test/page.tsx";
import { AdminShell, AgentScreen, CreateScreen, DeploymentsScreen, NewAgentScreen, SessionsScreen } from "./service.ts";
import { BLANK_AGENT } from "~/modules/agent-config/service.ts";
import type { AgentRow } from "~/modules/agent-config/types.ts";
import type { ChatRow, WorkspaceRow } from "~/modules/protocol/types.ts";

const agent = (more: Partial<AgentRow> = {}): AgentRow => ({
  id: "a1",
  config: { ...BLANK_AGENT, name: "Researcher", system: "Cite everything." },
  version: 2,
  versions: [
    { version: 2, savedAt: 2, savedBy: "Bo" },
    { version: 1, savedAt: 1, savedBy: "Bo" },
  ],
  createdAt: 1,
  createdBy: "Bo",
  ...more,
});
const chat = (id: number, title: string, more: Partial<ChatRow> = {}): ChatRow => ({
  id,
  title,
  pinned: false,
  createdAt: 1,
  updatedAt: id,
  createdBy: "Bo",
  status: "idle",
  ...more,
});
const workspace = (id: string, name: string, chats: readonly ChatRow[] = []): WorkspaceRow => ({
  id,
  name,
  pinned: false,
  createdAt: 1,
  updatedAt: 1,
  createdBy: "Bo",
  chats,
  documents: [],
});
async function show(page: React.ReactElement, more: Parameters<typeof snapshot>[0] = {}): Promise<ServerSocket> {
  open(known, <AdminShell path="/admin">{page}</AdminShell>);
  const directory = await socketTo("/api/directory/socket");
  directory.say(snapshot(more));
  return directory;
}
const answer = (directory: ServerSocket, requestId: string) =>
  directory.say({ type: "command.result", requestId, ok: true, output: { kind: "done" } });
const button = (name: string) => screen.findByRole<HTMLButtonElement>("button", { name });
const isOff = (element: HTMLElement) => element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";

describe("who sees it", () => {
  it("is an administrator", async () => {
    await show(<CreateScreen />, { isAdmin: false });
    expect(await screen.findByText("Only administrators can open this")).toBeTruthy();
    expect(screen.queryByText("What should the agent do?")).toBeNull();
  });
});

describe("a new agent", () => {
  it("begins from a template and is saved as version one", async () => {
    const directory = await show(<NewAgentScreen template="source-checker" />);
    expect(await screen.findByDisplayValue("Source checker")).toBeTruthy();
    await userEvent.click(await button("Create agent"));
    expect(await sentTo(directory, "agent.save")).toMatchObject({ basedOn: 0, config: { name: "Source checker", tools: ["web"] } });
  });

  it("begins from a drafted config, and ignores one that does not check", async () => {
    await show(<NewAgentScreen draft={{ ...BLANK_AGENT, name: "Drafted" }} />);
    expect(await screen.findByDisplayValue("Drafted")).toBeTruthy();
  });

  it("ignores a draft that is not a config", async () => {
    await show(<NewAgentScreen draft={{ name: "Forged", tools: ["shell"] }} />);
    expect(await screen.findByDisplayValue("Untitled agent")).toBeTruthy();
  });

  it("cannot be created without a name", async () => {
    await show(<NewAgentScreen />);
    await userEvent.clear(await screen.findByDisplayValue("Untitled agent"));
    expect(isOff(await button("Create agent"))).toBe(true);
  });
});

describe("editing", () => {
  it("saves on top of the version it started from, and deploys only what is saved", async () => {
    const directory = await show(<AgentScreen agentId="a1" />, { agents: [agent()] });
    await userEvent.type(await screen.findByDisplayValue("Cite everything."), " Twice.");
    expect(isOff(await button("Deploy"))).toBe(true);
    await userEvent.click(await button("Save"));
    const saved = await sentTo(directory, "agent.save");
    expect(saved).toMatchObject({ agentId: "a1", basedOn: 2, config: { system: "Cite everything. Twice." } });
    answer(directory, saved.requestId);
    await waitFor(async () => expect(isOff(await button("Deploy"))).toBe(false));
  });

  it("says when someone else saved meanwhile", async () => {
    const directory = await show(<AgentScreen agentId="a1" />, { agents: [agent()] });
    await screen.findByDisplayValue("Cite everything.");
    const versions = [{ version: 3, savedAt: 3, savedBy: "Cleo" }, ...agent().versions];
    directory.say({
      type: "agent.changed",
      agent: agent({ version: 3, versions, config: { ...BLANK_AGENT, name: "Researcher", system: "New." } }),
    });
    expect(await screen.findByText("Cleo saved version 3")).toBeTruthy();
    expect(screen.getByDisplayValue("Cite everything.")).toBeTruthy();
    await userEvent.click(await button("Load it"));
    expect(await screen.findByDisplayValue("New.")).toBeTruthy();
  });

  it("takes YAML that checks and explains YAML that does not", async () => {
    await show(<AgentScreen agentId="a1" />, { agents: [agent()] });
    await userEvent.click(await screen.findByRole("radio", { name: "YAML" }));
    await userEvent.click(await button("Edit"));
    const field = await screen.findByRole("textbox", { name: "YAML" });
    await userEvent.clear(field);
    await userEvent.type(field, "name: Other{Enter}tools: shell");
    expect(isOff(await button("Apply"))).toBe(true);
    await userEvent.clear(field);
    const text = "name: Other\ndescription: ''\nmodel: vibeproxy/gpt-6-luna\nthinking: low\nsystem: Be brief.\ntools: [[web]\nmax_turns: 5";
    await userEvent.type(field, text);
    await userEvent.click(await button("Apply"));
    await userEvent.click(await screen.findByRole("radio", { name: "Form" }));
    expect(await screen.findByDisplayValue("Be brief.")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Model" }).textContent).toContain("Luna");
  });
});

describe("deploying", () => {
  it("asks which version and where", async () => {
    const directory = await show(<AgentScreen agentId="a1" />, {
      agents: [agent()],
      workspaces: [workspace("w1", "General"), workspace("w2", "Lab")],
    });
    await userEvent.click(await button("Deploy"));
    const dialog = within(await screen.findByRole("dialog"));
    await userEvent.click(dialog.getByRole("radio", { name: /Chosen workspaces/u }));
    expect(isOff(dialog.getByRole("button", { name: "Deploy" }))).toBe(true);
    await userEvent.click(dialog.getByRole("checkbox", { name: "Lab" }));
    await userEvent.click(dialog.getByRole("button", { name: "Deploy" }));
    expect(await sentTo(directory, "agent.deploy")).toMatchObject({ agentId: "a1", version: 2, to: ["w2"] });
  });

  it("can be stopped", async () => {
    const deployment = { version: 1, to: ["w1"], at: 1, by: "Bo", name: "Researcher", description: "" };
    const directory = await show(<DeploymentsScreen />, { agents: [agent({ deployment })], workspaces: [workspace("w1", "General")] });
    expect(await screen.findByText("General")).toBeTruthy();
    await userEvent.click(await button("Stop"));
    expect(await sentTo(directory, "agent.retire")).toMatchObject({ agentId: "a1" });
  });
});

describe("sessions", () => {
  it("lists every chat and narrows by what is chosen", async () => {
    const stamp = { id: "a1", name: "Researcher", version: 2 };
    const chats = [chat(1, "Plain"), chat(2, "Checked", { agent: stamp }), chat(3, "Old", { archivedAt: 9 })];
    await show(<SessionsScreen />, { workspaces: [workspace("w1", "General", chats)] });
    expect((await screen.findByRole("link", { name: "Checked" })).getAttribute("href")).toBe("/w/w1/c/2");
    expect(screen.getByText("Researcher v2")).toBeTruthy();
    expect(screen.queryByText("Old")).toBeNull();
    await userEvent.type(screen.getByLabelText("Find"), "plain");
    expect(screen.queryByText("Checked")).toBeNull();
    expect(screen.getByText("Plain")).toBeTruthy();
  });
});
