import { expect, test } from "@playwright/test";
import { acme, type Acme } from "./acme.ts";
import { api, choose, downloaded, openSettings, reloaded, save, tab, toast } from "./settings.ts";
import { shot } from "./shots.ts";
import { signedIn } from "./team.ts";

/* The rest of the workspace settings: what the workspace spends, what it logs, what it runs on, and who may open what. */

test.describe.configure({ mode: "serial" });
let app: Acme;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  app = await acme(browser, "-b");
});

test("Billing keeps a limit on sandbox spending", async () => {
  const { page, id } = app;
  await openSettings(page, id, "billing", "Billing");
  const stop = page.getByRole("switch", { name: /Stop sandboxes at a limit/u });
  if (!(await stop.isChecked())) await stop.click();
  await page.getByLabel("Dollars over the plan").fill("75");
  await page.getByLabel("Dollars over the plan").blur();
  await shot(page, "ws-billing", "both");
  await save(page, "Save limit");
  await reloaded(page, "Billing");
  await expect(page.getByLabel("Dollars over the plan")).toHaveValue("75");
});

test("Usage keeps a manager's sandbox budget, and takes it away", async () => {
  const { page, id } = app;
  await openSettings(page, id, "usage", "Usage");
  await shot(page, "ws-usage", "both");
  await page.getByRole("button", { name: "Set a budget for Launch" }).click();
  await page.getByLabel("Launch's sandbox hours").fill("12");
  await page.getByLabel("Launch's sandbox hours").blur();
  await choose(page, "When it is reached", "Stop its sandboxes");
  await save(page, "Save budget");
  await reloaded(page, "Usage");
  await expect(page.getByLabel("Launch's sandbox hours")).toHaveValue("12");
  await shot(page, "ws-usage-budget", "both");
  await page.getByRole("button", { name: "Remove Launch's budget" }).click();
  await reloaded(page, "Usage");
  await expect(page.getByRole("button", { name: "Set a budget for Launch" })).toBeVisible();
});

test("the Audit log filters, pages and exports", async () => {
  const { page, id } = app;
  for (let turn = 0; turn < 60; turn += 1)
    await api(page, "PUT", `/api/workspaces/${id}/permissions`, {
      person: `email:bo.larsen${app.tag}@acme.test`,
      scope: "action",
      key: "task.delete",
      value: turn % 2 === 0 ? "ask" : null,
    });
  await openSettings(page, id, "audit", "Audit log");
  await expect(page.getByText("50 lines shown, more below")).toBeVisible();
  await shot(page, "ws-audit", "both");
  await page.getByRole("button", { name: "Load older lines" }).click();
  await expect(page.getByText(/^(5[1-9]|[6-9]\d|\d{3,}) lines shown/u)).toBeVisible();
  // The filter is Astryx's PowerSearch: a field, then its value; each token narrows what the server sends.
  const filterBy = async (field: string, value: string) => {
    const search = page.getByRole("combobox", { name: "Filter the audit log" });
    await search.click();
    await search.pressSequentially(field);
    await page.getByRole("option", { name: field, exact: true }).click();
    await page.getByRole("combobox", { name: "Value" }).click();
    await page.getByRole("option", { name: value }).click();
  };
  await filterBy("Outcome", "Refused");
  await expect(page.getByRole("heading", { name: /Nothing matches/u })).toBeVisible();
  await shot(page, "ws-audit-filtered", "both");
  await page.getByRole("button", { name: "Clear all" }).click();
  await filterBy("When", "Last 24 hours");
  await expect(page.getByText(/lines shown/u)).toBeVisible();
  expect(await downloaded(page, () => page.getByRole("button", { name: "Export CSV" }).click())).toBe("audit-log.csv");
});

test("Keys tests again, replaces a key, edits an endpoint, and removes a connection", async () => {
  const { page, id } = app;
  await api(page, "POST", `/api/workspaces/${id}/models`, {
    source: "endpoint",
    label: "Our vLLM",
    baseUrl: "https://models.example.test/v1",
    key: "endpoint-key",
  });
  await openSettings(page, id, "keys", "Keys and connections");
  await shot(page, "ws-keys", "both");
  await page.getByRole("button", { name: "Test Anthropic again" }).click();
  await expect(toast(page, "Anthropic works")).toBeVisible();
  await page.getByRole("button", { name: "More for Anthropic" }).click();
  await page.getByRole("menuitem", { name: "Replace key" }).click();
  await page
    .getByRole("dialog", { name: /^Replace/u })
    .getByLabel("New key")
    .fill("sk-ant-wrong");
  await page.getByRole("button", { name: "Replace and test" }).click();
  await expect(page.getByRole("dialog").getByText(/The change was kept, but the test call failed/u)).toBeVisible();
  await shot(page, "ws-keys-replace-refused", "both");
  await page
    .getByRole("dialog", { name: /^Replace/u })
    .getByLabel("New key")
    .fill("sk-ant-test-works");
  await page.getByRole("button", { name: "Replace and test" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("button", { name: "More for Our vLLM" }).click();
  await page.getByRole("menuitem", { name: "Edit endpoint" }).click();
  await page.getByRole("dialog", { name: /^Edit/u }).getByLabel("Base URL").fill("https://models.example.test/v2");
  await expect(page.getByRole("button", { name: "Save and test" })).toBeDisabled();
  await shot(page, "ws-keys-edit-endpoint", "both");
  await page.getByRole("dialog", { name: /^Edit/u }).getByLabel("Base URL").fill("https://models.example.test/v1");
  await page.getByRole("dialog", { name: /^Edit/u }).getByLabel("Name").fill("Our vLLM, EU");
  await page.getByRole("button", { name: "Save and test" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await reloaded(page, "Keys and connections");
  await expect(page.getByText("Our vLLM, EU").first()).toBeVisible();
  await page.getByRole("button", { name: "More for Our vLLM, EU" }).click();
  await page.getByRole("menuitem", { name: "Remove" }).click();
  await shot(page, "ws-keys-remove", "both");
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove connection" }).click();
  await reloaded(page, "Keys and connections");
  await expect(page.getByText("Our vLLM, EU")).toHaveCount(0);
});

test("Keys lists the vault's secret names, adds one and removes one", async () => {
  const { page, id } = app;
  await openSettings(page, id, "keys", "Keys and connections");
  await page.getByRole("button", { name: "Add a secret" }).click();
  await page.getByRole("dialog", { name: "Add a secret" }).getByLabel("Name").fill("deploy-token");
  await page.getByRole("dialog", { name: "Add a secret" }).getByLabel("Value").fill("not-a-real-token");
  await page.getByRole("button", { name: "Add to the vault" }).click();
  await reloaded(page, "Keys and connections");
  await expect(page.getByText("deploy-token")).toBeVisible();
  await expect(page.getByText("not-a-real-token")).toHaveCount(0);
  await shot(page, "ws-keys-secrets", "both");
  await page.getByRole("button", { name: "Remove the secret deploy-token" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove secret" }).click();
  await reloaded(page, "Keys and connections");
  await expect(page.getByText("deploy-token")).toHaveCount(0);
});

test("Environments test a start, move an agent out, and delete one", async () => {
  const { page, id } = app;
  await page.goto(`/ws/${id}/environments`);
  await expect(page.getByRole("heading", { level: 1, name: "Environments" })).toBeVisible();
  await expect(page.getByText("npm").first()).toBeVisible();
  await shot(page, "ws-environments", "both");
  await page.getByRole("button", { name: "Test start of Web app" }).click();
  const dialog = page.getByRole("dialog", { name: /^Test start/u });
  await expect(dialog.getByText(/^(Ready|Setup failed)$/u)).toBeVisible();
  await shot(page, "ws-environments-test", "both");
  await dialog.getByRole("button", { name: "Done" }).click();
  await page
    .getByRole("button", { name: /Worker/u })
    .first()
    .click();
  await expect(toast(page, "Worker left the environment")).toBeVisible();
  await reloaded(page, "Environments");
  await expect(page.getByText("No agent yet").first()).toBeVisible();
  await page.getByRole("button", { name: "More for Docs" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await shot(page, "ws-environments-delete", "both");
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete environment" }).click();
  await reloaded(page, "Environments");
  await expect(page.getByText("Docs", { exact: true })).toHaveCount(0);
});

test("Profile and Notifications keep what a person chose", async () => {
  const { page, id } = app;
  await openSettings(page, id, "profile", "Profile");
  await choose(page, "Time zone", "Europe/Paris", "Paris");
  await page.getByRole("switch", { name: "I have working hours" }).click();
  await shot(page, "ws-profile", "both");
  await save(page);
  await reloaded(page, "Profile");
  await expect(page.getByRole("button", { name: /Time zone/u })).toContainText("Paris");
  await expect(page.getByRole("switch", { name: "I have working hours" })).toBeChecked();
  await openSettings(page, id, "notifications", "Notifications");
  const first = page.getByRole("switch").first();
  await first.click();
  await page.getByRole("switch", { name: /Hold email/u }).click();
  await shot(page, "ws-notifications", "both");
  await save(page);
  await reloaded(page, "Notifications");
  await expect(page.getByRole("switch").first()).toBeChecked();
  await expect(page.getByRole("switch", { name: /Hold email/u })).toBeChecked();
});

test("Profile shows where a person is signed in, and ends it elsewhere", async ({ browser }) => {
  const { page, id } = app;
  const other = await signedIn(browser, `ama.mensah${app.tag}@acme.test`, "Ama Mensah");
  await openSettings(page, id, "profile", "Profile");
  await expect(page.getByText(`ama.mensah${app.tag}@acme.test`).first()).toBeVisible();
  await page.getByRole("textbox", { name: "Another email address" }).fill(`ama.home${app.tag}@home.test`);
  await page.getByRole("button", { name: "Add email" }).click();
  await expect(page.getByText(/We sent a link to ama\.home/u)).toBeVisible();
  await expect(page.getByText("This one", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add email" }).scrollIntoViewIfNeeded();
  await shot(page, "ws-profile-accounts", "both");
  await page.getByRole("button", { name: "Sign out everywhere else" }).scrollIntoViewIfNeeded();
  await shot(page, "ws-profile-sign-ins", "both");
  await page.getByRole("button", { name: "Sign out everywhere else" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("button", { name: "Sign out everywhere else" })).toHaveCount(0);
  expect(await (await other.request.get("/api/auth/get-session")).json()).toBeNull();
});

test("a change nobody saved is not thrown away without asking", async () => {
  const { page, id } = app;
  await openSettings(page, id, "general", "General");
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Changed but not saved");
  await page.getByRole("link", { name: "Members" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Leave without saving?");
  await shot(page, "ws-unsaved", "both");
  await dialog.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByRole("textbox", { name: "Name", exact: true })).toHaveValue("Changed but not saved");
  await page.getByRole("link", { name: "Members" }).click();
  await dialog.getByRole("button", { name: "Leave" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Members" })).toBeVisible();
  await tab(page, "Team").waitFor();
});

test("a Builder is offered only their own settings", async ({ browser }) => {
  const { id } = app;
  const bo = await signedIn(browser, `bo.larsen${app.tag}@acme.test`, "Bo Larsen");
  await bo.goto(`/ws/${id}/inbox`);
  await expect(bo.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await bo.getByRole("button", { name: /Bo Larsen/u }).click();
  await bo.getByRole("link", { name: "Profile" }).click();
  await expect(bo.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible();
  await expect(bo.getByRole("link", { name: "Notifications" })).toBeVisible();
  await expect(bo.getByRole("link", { name: "Members" })).toHaveCount(0);
  await shot(bo, "ws-builder-profile", "both");
  await bo.goto(`/ws/${id}/settings/members`);
  await expect(bo.getByRole("heading", { level: 1, name: "Only Owners open this page" })).toBeVisible();
  await shot(bo, "ws-builder-refused", "both");
});
