import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { createServer } from "~/modules/team-core/service.ts";
import { afterEach, describe, expect, it } from "vitest";
import { createSettingsApi, KeysScreen, RolesScreen } from "./service.ts";
import type { ModelData, RolesData } from "./types.ts";

afterEach(cleanup);

const OK = { _tag: "Loaded", value: true } as const;

/** Chooses an item of an open menu, from the keyboard, as a menu is used without a pointer. */
async function menuItem(name: string): Promise<void> {
  (await screen.findByRole("menuitem", { name })).focus();
  await userEvent.keyboard("{Enter}");
}

/** Every request it gets, answered by path. */
function serving(answers: Readonly<Record<string, unknown>>) {
  const asked: { readonly path: string; readonly method: string; readonly body: unknown }[] = [];
  const api = createSettingsApi(
    createServer(async (path, init) => {
      asked.push({ path, method: init?.method ?? "GET", body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined });
      const body = answers[path.split("?")[0] ?? path];
      return body === undefined ? Response.json({ error: "Only an Owner can" }, { status: 403 }) : Response.json(body);
    }),
  );
  return { api, asked };
}

describe("the routes of the screens that change one thing at a time", () => {
  it("narrows what the server sends, and says what each answer meant", async () => {
    const { api } = serving({
      "/api/workspaces/w1/roles": {
        presets: {
          owner: { categories: { tasks: "on" }, actions: {} },
          builder: { categories: { tasks: "on" }, actions: { "task.delete": "ask" } },
        },
        categories: ["tasks"],
        actions: [{ id: "task.delete", category: "tasks", label: "Delete a task" }],
        mine: { preset: "builder", own: { categories: {}, actions: { "task.move": "off" } } },
      },
      "/api/workspaces/w1/audit": {
        entries: [{ at: 1, by: { kind: "manager", name: "Launch" }, outcome: "done", sentence: "x" }],
        next: "9:a",
      },
      "/api/workspaces/w1/models/m-1/check": {
        _tag: "Checked",
        connection: { label: "Anthropic", check: { _tag: "Failed", error: "invalid key" } },
      },
      "/api/workspaces/w1/environments/env-1": { _tag: "Deleted", agents: ["Worker"] },
    });
    const roles = await api.roles("w1");
    expect(roles._tag === "Loaded" && roles.value.presets.builder.actions).toEqual({ "task.delete": "ask" });
    expect(roles._tag === "Loaded" && roles.value.mine.own.actions).toEqual({ "task.move": "off" });
    const page = await api.auditPage("w1", {});
    expect(page._tag === "Loaded" && page.value.next).toBe("9:a");
    expect(page._tag === "Loaded" && page.value.entries[0]?.isManager).toBe(true);
    expect(await api.recheckModel("w1", "m-1")).toEqual({
      _tag: "Loaded",
      value: { label: "Anthropic", works: false, error: "invalid key" },
    });
    expect(await api.deleteEnvironment("w1", "env-1")).toEqual({ _tag: "Loaded", value: ["Worker"] });
  });

  it("sends filters and the page to continue from, and each change with what it deletes", async () => {
    const { api, asked } = serving({});
    await api.auditPage("w1", { outcome: "refused", since: 5, manager: "" }, "cursor");
    await api.setChange("w1", { person: "email:bo@acme.test", scope: "category", key: "tasks", value: null });
    await api.setBudget("w1", "m1", { hours: 12, whenReached: "stop" });
    await api.removeModel("w1", "m-1");
    await api.removeSecret("w1", "npm");
    const query = new URLSearchParams(asked[0]?.path.split("?")[1]);
    expect(Object.fromEntries(query)).toEqual({ limit: "50", outcome: "refused", since: "5", manager: "", before: "cursor" });
    expect(asked.slice(1)).toEqual([
      {
        path: "/api/workspaces/w1/permissions",
        method: "PUT",
        body: { person: "email:bo@acme.test", scope: "category", key: "tasks", value: null },
      },
      { path: "/api/workspaces/w1/budgets", method: "PUT", body: { managerId: "m1", budget: { hours: 12, whenReached: "stop" } } },
      { path: "/api/workspaces/w1/models/m-1", method: "DELETE", body: { confirm: "m-1" } },
      { path: "/api/workspaces/w1/secrets/npm", method: "DELETE", body: { confirm: "npm" } },
    ]);
  });
});

const ROLES: RolesData = {
  presets: {
    owner: { categories: { tasks: "on" }, actions: {} },
    builder: { categories: { tasks: "on" }, actions: {} },
    member: { categories: { tasks: "ask" }, actions: { "task.delete": "off" } },
  },
  categories: ["tasks"],
  actions: [
    { id: "task.create", category: "tasks", label: "Add a task" },
    { id: "task.delete", category: "tasks", label: "Delete a task for good" },
  ],
  mine: { preset: "owner", own: { categories: {}, actions: {} } },
};

describe("roles and permissions", () => {
  it("shows what each preset says, and what a person's own setting starts from", () => {
    render(
      <LayerProvider>
        <RolesScreen
          roles={ROLES}
          people={[{ person: "email:bo@acme.test", name: "Bo", email: "bo@acme.test", preset: "member", changes: [] }]}
          onChange={async () => OK}
        />
      </LayerProvider>,
    );
    expect(screen.getByText("Member: Mixed")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Work on tasks for Bo" }).textContent).toContain("Preset: Mixed");
    expect(screen.getByRole("combobox", { name: "Delete a task for good for Bo" }).textContent).toContain("Preset: Off");
  });

  it("offers no editing to someone who is not an Owner", () => {
    render(
      <LayerProvider>
        <RolesScreen roles={ROLES} onChange={async () => OK} />
      </LayerProvider>,
    );
    expect(screen.getByText("Only an Owner changes what a person may do")).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Person" })).toBeNull();
  });
});

const MODEL: ModelData = {
  id: "m-1",
  source: "endpoint",
  label: "Our vLLM",
  baseUrl: "https://models.example.test/v1",
  models: ["a"],
  checkedAt: 0,
};

describe("keys", () => {
  it("asks for the key again when an endpoint's address changes, and never shows one", async () => {
    const edits: unknown[] = [];
    render(
      <LayerProvider>
        <KeysScreen
          keys={{ connections: [MODEL] }}
          gitHub={{ repos: [] }}
          secrets={[{ name: "npm", updatedAt: 0 }]}
          on={{
            onRecheck: async () => undefined,
            onReplace: async () => ({ _tag: "Loaded", value: { label: "x", works: true } }),
            onEdit: async (_, edit) => (edits.push(edit), { _tag: "Loaded", value: { label: "x", works: true } }),
            onRemove: async () => OK,
          }}
          onAdd={async () => OK}
          onLeave={() => undefined}
          onStartChatGpt={async () => ({ _tag: "Loaded", value: "" })}
          onFinishChatGpt={async () => OK}
          onAddSecret={async () => OK}
          onRemoveSecret={async () => ({ _tag: "Loaded", value: [] })}
        />
      </LayerProvider>,
    );
    expect(screen.getByText("npm")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "More for Our vLLM" }));
    await menuItem("Edit endpoint");
    const dialog = await screen.findByRole("dialog", { name: /^Edit/u });
    await userEvent.clear(within(dialog).getByLabelText(/Base URL/u));
    await userEvent.type(within(dialog).getByLabelText(/Base URL/u), "https://other.example.test/v1");
    const submit = within(dialog).getByRole("button", { name: "Save and test" });
    expect(submit.getAttribute("aria-disabled") === "true" || submit.hasAttribute("disabled")).toBe(true);
    await userEvent.type(within(dialog).getByLabelText(/^Key/u), "k");
    await userEvent.click(submit);
    expect(edits).toEqual([{ label: "Our vLLM", baseUrl: "https://other.example.test/v1", key: "k" }]);
  });
});
