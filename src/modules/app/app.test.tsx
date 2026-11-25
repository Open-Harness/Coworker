import type { ReactElement } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { known, open, sentTo, ServerSocket, snapshot, socketTo } from "../../../test/page.tsx";
import { Landing, LibraryScreen, Shell } from "./service.ts";
import { BLANK_AGENT } from "~/modules/agent-config/service.ts";
import { PROTOCOL_VERSION } from "~/modules/protocol/service.ts";

const inShell = (page: ReactElement) => <Shell selected={{ page: "home" }}>{page}</Shell>;
const landing = inShell(<Landing />);

describe("opening the page", () => {
  it("asks a signed-out person to sign in with an email link before connecting", async () => {
    const { account } = open(undefined, landing);
    const field = await screen.findByLabelText(/Email/u);
    await userEvent.type(field, "amina@example.test{Enter}");
    expect(account.sendLink).toHaveBeenCalledWith("amina@example.test", "/");
    expect(await screen.findByText(/We sent a link to amina@example.test/u)).toBeTruthy();
    expect(ServerSocket.opened).toHaveLength(0);
  });

  it("greets a known visitor and lets them start once the directory arrives", async () => {
    open(known, landing);
    const directory = await socketTo("/api/directory/socket");
    expect(await screen.findByText("Hi, Amina")).toBeTruthy();
    expect(screen.queryByLabelText("Model")).toBeNull();
    directory.say(snapshot());
    expect((await screen.findAllByLabelText("Model")).length).toBeGreaterThan(0);
    expect(screen.queryByText("No model can answer yet")).toBeNull();
  });

  it("says so when no model can answer", async () => {
    open(known, landing);
    (await socketTo("/api/directory/socket")).say(snapshot({ models: [] }));
    expect(await screen.findByText("No model can answer yet")).toBeTruthy();
  });

  it("offers a reload when the server speaks another version", async () => {
    open(known, landing);
    (await socketTo("/api/directory/socket")).say(snapshot({ protocol: PROTOCOL_VERSION + 1 }));
    expect(await screen.findByRole("button", { name: "Reload" })).toBeTruthy();
  });
});

describe("changing things", () => {
  it("creates a workspace and shows why one was refused", async () => {
    open(known, landing);
    const directory = await socketTo("/api/directory/socket");
    directory.say(snapshot());
    await userEvent.click(await screen.findByRole("button", { name: "New workspace" }));
    await userEvent.type(await screen.findByLabelText(/^Name/u), "Research{Enter}");
    const command = await sentTo(directory, "workspace.create");
    expect(command).toMatchObject({ name: "Research" });
    const error = { code: "rejected", message: "Too many workspaces" } as const;
    directory.say({ type: "command.result", requestId: command.requestId, ok: false, error });
    expect((await screen.findAllByText("Too many workspaces")).length).toBeGreaterThan(0);
  });

  it("restores from the library", async () => {
    open(known, inShell(<LibraryScreen />));
    const directory = await socketTo("/api/directory/socket");
    const row = {
      id: "w1",
      name: "Old",
      pinned: false,
      archivedAt: 5,
      createdAt: 1,
      updatedAt: 1,
      createdBy: "Bo",
      chats: [],
      documents: [],
    };
    directory.say(snapshot({ workspaces: [row] }));
    await userEvent.click(await screen.findByRole("button", { name: /Restore/u }));
    await waitFor(() =>
      expect(directory.sent).toMatchObject([{ type: "workspace.update", workspaceId: "w1", change: { archived: false } }]),
    );
  });
});

const workspace = { id: "w1", name: "General", pinned: false, createdAt: 1, updatedAt: 1, createdBy: "Bo", chats: [], documents: [] };
const deployed = (id: string, name: string, to: "all" | string[]) => ({
  id,
  config: { ...BLANK_AGENT, name },
  version: 1,
  versions: [{ version: 1, savedAt: 1, savedBy: "Bo" }],
  createdAt: 1,
  createdBy: "Bo",
  deployment: { version: 1, to, at: 1, by: "Bo", name, description: "" },
});

describe("starting a chat", () => {
  it("offers the agents deployed there and asks for the chosen one", async () => {
    open(known, landing);
    const directory = await socketTo("/api/directory/socket");
    directory.say(snapshot({ workspaces: [workspace], agents: [deployed("a1", "Here", ["w1"]), deployed("a2", "Elsewhere", ["w2"])] }));
    await userEvent.click((await screen.findAllByRole("combobox", { name: "Agent" }))[0]!);
    expect(screen.queryByText("Elsewhere")).toBeNull();
    // By keyboard: happy-dom closes the popover before a click lands.
    await screen.findByRole("option", { name: /Here/u });
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(screen.queryByRole("combobox", { name: "Model" })).toBeNull());
  });
});

describe("the admin view", () => {
  it("is offered to administrators only", async () => {
    open(known, landing);
    const directory = await socketTo("/api/directory/socket");
    directory.say(snapshot({ isAdmin: false }));
    await screen.findByText("New workspace");
    expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
    directory.say(snapshot({ isAdmin: true }));
    expect(await screen.findByRole("link", { name: "Admin" })).toBeTruthy();
  });
});
