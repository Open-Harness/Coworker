import { expect, test } from "@playwright/test";
import { acme, type Acme } from "./acme.ts";
import { shot } from "./shots.ts";
import { signedIn } from "./team.ts";

/* Every screen of the hosted app, with a lived-in workspace behind it. The shots are for people to look at. */

test.describe.configure({ mode: "serial" });
let app: Acme;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  app = await acme(browser);
});

const SETTINGS = [
  ["general", "General"],
  ["members", "Members"],
  ["keys", "Keys and connections"],
  ["usage", "Usage"],
  ["billing", "Billing"],
  ["audit", "Audit log"],
] as const;

for (const [path, heading] of SETTINGS) {
  test(`settings: ${path}`, async () => {
    const { page, id } = app;
    await page.goto(`/ws/${id}/settings/${path}`);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole("link", { name: heading })).toBeVisible();
    await shot(page, `settings-${path}`, "both");
  });
}

test("settings: members, the other tabs", async () => {
  const { page, id } = app;
  await page.goto(`/ws/${id}/settings/members`);
  await page
    .getByRole("button", { name: /^Invites/u })
    .or(page.getByRole("tab", { name: /^Invites/u }))
    .click();
  await expect(page.getByText("eve@partner.test")).toBeVisible();
  await shot(page, "settings-members-invites", "both");
  await page
    .getByRole("button", { name: "Links and domains" })
    .or(page.getByRole("tab", { name: "Links and domains" }))
    .click();
  await expect(page.getByText(/\/join\/link\//u)).toBeVisible();
  await shot(page, "settings-members-joining", "both");
});

test("the shell opens each manager's board, chat and mission", async () => {
  const { page, id, launch, incidents } = app;
  await page.goto(`/ws/${id}/inbox`);
  await expect(page.getByRole("heading", { level: 1, name: "Inbox" })).toBeVisible();
  await shot(page, "inbox", "both");
  await page.goto(`/ws/${id}/m/${launch.managerId}`);
  await expect(page.getByRole("heading", { level: 1, name: "Board" })).toBeVisible();
  for (const view of ["List", "Console", "Inbox", "Kanban"]) {
    await page.getByRole("radio", { name: view }).click();
    await shot(page, `shell-board-${view.toLowerCase()}`, "both");
  }
  await page.getByText("Check a 150k row export", { exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Check a 150k row export" })).toBeVisible();
  await shot(page, "shell-board-task", "both");
  await page.goto(`/ws/${id}/m/${launch.managerId}/chat`);
  await expect(page.getByRole("heading", { level: 1, name: "Chat" })).toBeVisible();
  await expect(page.getByText("add a task: Plan the release call")).toBeVisible();
  await shot(page, "chat", "both");
  await page.goto(`/ws/${id}/m/${launch.managerId}/mission`);
  await expect(page.getByRole("heading", { level: 1, name: "Mission" })).toBeVisible();
  await shot(page, "mission", "both");
  await page.getByRole("link", { name: /What we promised/u }).click();
  await expect(page.getByRole("heading", { level: 2, name: "What we promised" })).toBeVisible();
  await shot(page, "mission-page", "both");
  await page.goto(`/ws/${id}/m/${incidents.managerId}`);
  await expect(page.getByRole("heading", { level: 1, name: "Board" })).toBeVisible();
  await shot(page, "shell-incident-console", "both");
});

test("a question opens from the Inbox", async () => {
  const { page, id } = app;
  await page.goto(`/ws/${id}/inbox`);
  // The row opens in the reading pane beside the list; the page has its own URL.
  await page.getByRole("cell", { name: /Should the v2.3 export docs/u }).click();
  await expect(page.getByRole("heading", { name: "What you're deciding" })).toBeVisible();
  await shot(page, "inbox-pane", "both");
  await page.getByRole("link", { name: "Open as a page" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Should the v2.3 export docs/u })).toBeVisible();
  await shot(page, "shell-needs-you", "both");
});

test("search finds tasks and mission pages", async () => {
  const { page, id } = app;
  await page.goto(`/ws/${id}/inbox`);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("combobox").fill("export");
  await expect(page.getByText("DT-2 Check a 150k row export")).toBeVisible();
  await shot(page, "search", "both");
});

test("people and environments", async () => {
  const { page, id } = app;
  await page.goto(`/ws/${id}/people`);
  await expect(page.getByText("Bo Larsen").first()).toBeVisible();
  await shot(page, "people", "both");
  await page.goto(`/ws/${id}/environments`);
  await expect(page.getByRole("heading", { level: 1, name: "Environments" })).toBeVisible();
  await shot(page, "environments", "both");
  await page.getByRole("button", { name: "New environment" }).click();
  await expect(page.getByLabel("Setup script")).toBeVisible();
  await shot(page, "environments-new", "both");
});

test("the dialogs", async () => {
  const { page, id } = app;
  const dialog = page.getByRole("dialog");
  const close = async () => {
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  };
  await page.goto(`/ws/${id}/inbox`);
  await page.getByRole("button", { name: "New manager" }).click();
  await expect(dialog.getByRole("heading", { name: "New manager" })).toBeVisible();
  await shot(page, "dialog-new-manager", "both");
  await close();
  await page.goto(`/ws/${id}/settings/keys`);
  for (const [button, name] of [
    ["Add a key", "key"],
    ["Sign in to ChatGPT", "chatgpt"],
  ] as const) {
    await page.getByRole("button", { name: button }).first().click();
    await expect(dialog.getByRole("heading").first()).toBeVisible();
    await shot(page, `dialog-${name}`, "both");
    await close();
  }
  await page.goto(`/ws/${id}/environments`);
  await page.getByRole("button", { name: "Add a secret" }).click();
  await shot(page, "dialog-secret", "both");
  await close();
  await page.goto(`/ws/${id}/people`);
  await page.getByRole("button", { name: "Add a handle" }).click();
  await shot(page, "dialog-handle", "both");
  await close();
});

test("a shared link, opened by someone new", async ({ browser }) => {
  const { page, id } = app;
  const { linkPath } = (await (await page.request.get(`/api/workspaces/${id}/join`)).json()) as { linkPath: string };
  const signedOut = await (await browser.newContext()).newPage();
  await signedOut.goto(linkPath);
  await expect(signedOut.getByRole("heading", { level: 1 })).toBeVisible();
  await shot(signedOut, "link-signed-out", "both");
  const zed = await signedIn(browser, "zed@shots.test", "Zed");
  await zed.goto(linkPath);
  await expect(zed.getByRole("heading", { level: 1 })).toBeVisible();
  await shot(zed, "link-signed-in", "both");
  await zed.goto(`${linkPath}x`);
  await zed.getByRole("button", { name: /^Join/u }).click();
  await expect(zed.getByRole("alert").first()).toBeVisible();
  await shot(zed, "link-wrong", "both");
});

test("a wide table scrolls sideways on a phone", async () => {
  const { page, id } = app;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/ws/${id}/settings/audit`);
  const last = page.getByRole("columnheader", { name: "Where" });
  await expect(last).not.toBeInViewport();
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
  await page.setViewportSize({ width: 1440, height: 900 });
});

test("the menu on a phone", async () => {
  const { page, id, launch } = app;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/ws/${id}/m/${launch.managerId}/chat`);
  await page
    .getByRole("button", { name: /navigation|menu/iu })
    .last()
    .click();
  await expect(page.getByRole("link", { name: "People" })).toBeVisible();
  await shot(page, "menu-phone-open");
  await page.setViewportSize({ width: 1440, height: 900 });
});

test("the workspaces a person is in, and the menu between them", async () => {
  const { page, id } = app;
  await page.goto("/ws");
  await expect(page.getByRole("heading", { level: 1, name: "Your workspaces" })).toBeVisible();
  await shot(page, "workspaces", "both");
  await page.goto(`/ws/${id}/inbox`);
  await page.getByRole("button", { name: "Acme, Open menu" }).press("Enter");
  await expect(page.getByText("ama-shots")).toBeVisible();
  await shot(page, "workspace-switcher", "both");
});

test("the dark theme", async () => {
  const { page, id, launch } = app;
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`/ws/${id}/m/${launch.managerId}`);
  await expect(page.getByRole("heading", { level: 1, name: "Board" })).toBeVisible();
  await shot(page, "dark-board", "both");
  await page.goto(`/ws/${id}/settings/members`);
  await expect(page.getByRole("heading", { level: 1, name: "Members" })).toBeVisible();
  await shot(page, "dark-members", "both");
  await page.emulateMedia({ colorScheme: null });
});

test("signing out ends the session", async () => {
  const { page, id } = app;
  await page.goto(`/ws/${id}/inbox`);
  await page.getByRole("button", { name: "Ama Mensah" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in or create an account" })).toBeVisible();
  expect((await page.request.get(`/api/workspaces/${id}`)).status()).toBe(401);
});
