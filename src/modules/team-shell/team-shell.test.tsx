import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { createServer } from "~/modules/team-core/service.ts";
import { afterEach, describe, expect, it } from "vitest";
import type { PermissionSet } from "~/modules/actions/types.ts";
import { createShellApi, pageOf, placeOf, TeamShell, WorkspacesPage } from "./service.ts";
import type { ShellApi, WorkspaceChoice } from "./types.ts";

afterEach(cleanup);

const ACME: WorkspaceChoice = { workspaceId: "w1", name: "Acme", address: "acme", role: "owner" };

const API: ShellApi = {
  workspaces: async () => ({ _tag: "Loaded", value: [ACME, { ...ACME, workspaceId: "w2", name: "Other", address: "other" }] }),
  managers: async () => ({ _tag: "Loaded", value: [{ managerId: "m1", name: "Launch", address: "launch@acme.test" }] }),
  own: async () => ({ _tag: "Loaded", value: { categories: {}, actions: {} } }),
  waiting: async () => ({ _tag: "Loaded", value: 3 }),
  search: async () => ({ _tag: "Loaded", value: [] }),
  createManager: async (_, { name }) => ({ _tag: "Loaded", value: { managerId: "m2", name, address: "two@acme.test" } }),
};

const roleIs = (role: WorkspaceChoice["role"]): ShellApi => ({
  ...API,
  workspaces: async () => ({ _tag: "Loaded", value: [{ ...ACME, role }] }),
});

function shell(api: ShellApi, path: string, workspaceId = "w1") {
  const went: string[] = [];
  let left = 0;
  render(
    <LayerProvider>
      <TeamShell
        api={api}
        workspaceId={workspaceId}
        path={path}
        me="Ama"
        onSignOut={() => (left += 1)}
        onGo={(address) => went.push(address)}
      >
        The screen
      </TeamShell>
    </LayerProvider>,
  );
  return { went, left: () => left };
}

describe("the sidebar", () => {
  it("links to the Inbox, each manager's pages, what they are built from and the settings", async () => {
    shell(API, "/ws/w1/m/m1/chat");
    const href = async (name: string) => (await screen.findByRole("link", { name })).getAttribute("href");
    expect(await href("Chat")).toBe("/ws/w1/m/m1/chat");
    expect(await href("Board")).toBe("/ws/w1/m/m1");
    expect(await href("Mission")).toBe("/ws/w1/m/m1/mission");
    expect(await href("People")).toBe("/ws/w1/people");
    expect(await href("Environments")).toBe("/ws/w1/environments");
    expect(await href("Settings")).toBe("/ws/w1/settings/general");
    expect(await screen.findByText("3")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Chat" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("The screen")).toBeTruthy();
  });

  it("offers settings to an Owner only, and a new manager to nobody who is a Member", async () => {
    shell(roleIs("builder"), "/ws/w1/inbox");
    expect(await screen.findByRole("button", { name: "New manager" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
    cleanup();
    shell(roleIs("member"), "/ws/w1/inbox");
    expect(await screen.findByRole("link", { name: "People" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "New manager" })).toBeNull();
  });

  it("gives way to the settings' own while they are open", async () => {
    shell(API, "/ws/w1/settings/billing");
    expect((await screen.findByRole("link", { name: "Billing" })).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Back to Acme" }).getAttribute("href")).toBe("/ws/w1/inbox");
    expect(screen.queryByRole("link", { name: "Board" })).toBeNull();
  });

  it("offers a Builder only their own settings, and an Owner the workspace's too", async () => {
    shell(roleIs("builder"), "/ws/w1/settings/profile");
    expect((await screen.findByRole("link", { name: "Notifications" })).getAttribute("href")).toBe("/ws/w1/settings/notifications");
    expect(screen.getByRole("link", { name: "Profile" }).getAttribute("aria-current")).toBe("page");
    expect(screen.queryByRole("link", { name: "Members" })).toBeNull();
    cleanup();
    shell(API, "/ws/w1/settings/profile");
    for (const name of ["General", "Members", "Roles and permissions", "Keys and connections", "Usage", "Billing", "Security", "Audit log"])
      expect(await screen.findByRole("link", { name })).toBeTruthy();
  });

  it("opens anyone's profile and notifications from under their name", async () => {
    shell(roleIs("member"), "/ws/w1/inbox");
    await userEvent.click(await screen.findByRole("button", { name: /Ama/u }));
    expect(screen.getByRole("link", { name: "Profile" }).getAttribute("href")).toBe("/ws/w1/settings/profile");
    expect(screen.getByRole("link", { name: "Notifications" }).getAttribute("href")).toBe("/ws/w1/settings/notifications");
  });

  it("signs out from under the person's name", async () => {
    const { left } = shell(API, "/ws/w1/inbox");
    await userEvent.click(await screen.findByRole("button", { name: /Ama/u }));
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(left()).toBe(1);
  });
});

const withOwn = (role: WorkspaceChoice["role"], own: PermissionSet): ShellApi => ({
  ...roleIs(role),
  own: async () => ({ _tag: "Loaded", value: own }),
});

describe("pages a role may not open", () => {
  it("shows a plain page with a way back instead of the page, and never mounts it", async () => {
    shell(roleIs("member"), "/ws/w1/settings/billing");
    expect(await screen.findByRole("heading", { name: "Only Owners open this page" })).toBeTruthy();
    expect(screen.getByText(/Ask an Owner/u)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to the Inbox" }).getAttribute("href")).toBe("/ws/w1/inbox");
    expect(screen.queryByText("The screen")).toBeNull();
  });

  it("opens what the role opens", async () => {
    shell(roleIs("member"), "/ws/w1/m/m1/mission");
    expect(await screen.findByText("The screen")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "You can't open this page" })).toBeNull();
  });

  it("follows what an Owner changed for the person: a read taken away closes its page and its link", async () => {
    const api = withOwn("member", { categories: {}, actions: { "mission.read": "off" } });
    shell(api, "/ws/w1/m/m1/mission");
    expect(await screen.findByRole("heading", { name: "You can't open this page" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Mission" })).toBeNull();
    expect(screen.getByRole("link", { name: "Board" })).toBeTruthy();
  });

  it("offers a Member only what the role opens: to read, to make managers when given that, never the vault", async () => {
    shell(roleIs("member"), "/ws/w1/inbox");
    expect(await screen.findByRole("link", { name: "Agents" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Launch settings" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Templates" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Environments" })).toBeNull();
    expect(screen.queryByRole("button", { name: "New manager" })).toBeNull();
    cleanup();
    shell(withOwn("member", { categories: {}, actions: { "manager.create": "on", "policy.read": "off" } }), "/ws/w1/m/m1/settings/sources");
    expect(await screen.findByRole("heading", { name: "You can't open this page" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "New manager" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Launch settings" })).toBeNull();
  });

  it("says so, and offers to try again, when what decides it did not load", async () => {
    let fails = true;
    const api: ShellApi = {
      ...API,
      own: async () => (fails ? { _tag: "Failed", message: "The server could not be reached" } : API.own("w1")),
    };
    shell(api, "/ws/w1/inbox");
    expect(await screen.findByText("Your access did not load")).toBeTruthy();
    expect(screen.queryByText("The screen")).toBeNull();
    fails = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("The screen")).toBeTruthy();
  });

  it("reads which page an address opens", () => {
    expect(pageOf("/ws/w1")).toBe("home");
    expect(pageOf("/ws/w1/m/m1/")).toBe("board");
    expect(pageOf("/ws/w1/inbox")).toBe("inbox");
    expect(pageOf("/ws/w1/m/m1/overview")).toBe("overview");
    expect(pageOf("/ws/w1/m/m1/tasks/DT-1")).toBe("task");
    expect(pageOf("/ws/w1/m/m1/runs/run-1")).toBe("run");
    expect(pageOf("/ws/w1/m/m1/settings/board")).toBe("manager-settings");
    expect(pageOf("/ws/w1/m/m1/settings")).toBe("manager-settings");
    expect(pageOf("/ws/w1/settings/audit")).toBe("workspace");
    expect(pageOf("/ws/w1/settings/profile")).toBe("profile");
    expect(pageOf("/ws/w1/nonsense")).toBeUndefined();
  });
});

describe("what is not there", () => {
  it("shows one page for a workspace that does not exist and one the person is not in", async () => {
    shell(API, "/ws/w9/inbox", "w9");
    expect(await screen.findByText("No such workspace")).toBeTruthy();
    expect(screen.queryByText("The screen")).toBeNull();
  });

  it("reads the place from the address", () => {
    expect(placeOf("/ws/w1/inbox/question%3A1")).toEqual({ kind: "inbox" });
    expect(placeOf("/ws/w1/m/m1")).toEqual({ kind: "manager", managerId: "m1", page: "board" });
    expect(placeOf("/ws/w1/settings/keys")).toEqual({ kind: "settings", page: "keys" });
    expect(placeOf("/ws/w1/settings/roles")).toEqual({ kind: "settings", page: "roles" });
    expect(placeOf("/ws/w1/settings/nonsense")).toEqual({ kind: "elsewhere" });
  });
});

describe("the workspaces page and the API", () => {
  it("lists the person's workspaces, from what the server sends", async () => {
    const api = createShellApi(
      createServer(async () =>
        Response.json({ workspaces: [{ workspaceId: "w1", name: "Acme", address: "acme", role: "owner" }, { name: "No id" }] }),
      ),
    );
    render(
      <LayerProvider>
        <WorkspacesPage api={api} empty="Nothing yet" />
      </LayerProvider>,
    );
    expect((await screen.findByRole("link", { name: /Acme/u })).getAttribute("href")).toBe("/ws/w1/inbox");
    expect(screen.queryByText("No id")).toBeNull();
  });

  it("counts only questions and approvals nobody answered", async () => {
    const items = [{ kind: "question" }, { kind: "approval", answer: { text: "yes" } }, { kind: "notice" }];
    const api = createShellApi(createServer(async () => Response.json({ items })));
    expect(await api.waiting("w1")).toEqual({ _tag: "Loaded", value: 1 });
  });
});
