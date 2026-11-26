import { expect, test, type Page } from "@playwright/test";
import { sign } from "@octokit/webhooks-methods";
import { createRequire } from "node:module";
import { shot } from "./shots.ts";
import { hasTask, lastMail, say, signedIn, team, type Team } from "./team.ts";

/* A manager's settings, its events, the templates, agents and skills, and the Task and run pages: each one opened,
   changed and saved in the browser, then reloaded to see that what was saved is still there. */

const examples = createRequire(import.meta.url)("@octokit/webhooks-examples") as { name: string; examples: object[] }[];

test.describe.configure({ mode: "serial" });
let launch: Team;
let page: Page;
const EMAIL = "builder@example.test";

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  page = await signedIn(browser, EMAIL, "Bea Builder");
  launch = await team(page, "mgrsettings");
  await say(launch, "add a task: Write the v2.3 changelog", "add-0");
  await hasTask(launch, "Write the v2.3 changelog");
});

const at = (path: string): string => `/ws/${launch.workspaceId}/m/${launch.managerId}/${path}`;
const heading = (name: string) => page.getByRole("heading", { level: 1, name, exact: true });

test("a manager's settings open on its sources, with Slack not available yet", async () => {
  await page.goto(at("settings"));
  await expect(heading("Settings")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sources" })).toBeVisible();
  await expect(page.getByText("Where this manager listens")).toBeVisible();
  await expect(page.getByText("Not available yet")).toBeVisible();
  await shot(page, "manager-sources", "both");
});

test("a manager's email page sends a test mail to the person looking", async () => {
  await page.goto(at("settings/sources?source=email"));
  await expect(page.getByText("How email works here")).toBeVisible();
  await shot(page, "manager-email", "both");
  await page.getByRole("button", { name: "Send a test mail" }).click();
  await expect(page.getByText("Test mail sent")).toBeVisible();
  expect(await lastMail(page, EMAIL)).toContain("Launch");
});

test("who may ask saves the accept mode, an allowed domain and what happens to strangers", async () => {
  await page.goto(at("settings/who-may-ask"));
  await page.getByRole("radio", { name: /Auto/u }).check();
  // Leaving with the edit unsaved asks first, and staying keeps it.
  await expect(page.getByText("Unsaved changes")).toBeVisible();
  await page.getByRole("link", { name: "Permissions" }).click();
  await expect(page.getByRole("alertdialog", { name: "Leave without saving?" })).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByRole("radio", { name: /Auto/u })).toBeChecked();
  await page.getByRole("button", { name: "Add someone" }).click();
  await page.getByRole("combobox", { name: "Who" }).click();
  await page.getByRole("option", { name: "An email domain" }).click();
  await page.getByRole("textbox", { name: "Domain" }).fill("partner.test");
  await page.getByRole("button", { name: "Add to the list" }).click();
  await expect(page.getByText("@partner.test")).toBeVisible();
  await expect(page.getByText("Unsaved changes")).toBeVisible();
  await shot(page, "manager-who-may-ask", "both");
  await page.getByRole("button", { name: "Save who may ask" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("radio", { name: /Auto/u })).toBeChecked();
  await expect(page.getByText("@partner.test")).toBeVisible();
});

test("permissions save one action set to ask and keep it after a reload", async () => {
  await page.goto(at("settings/permissions"));
  await page.getByRole("button", { name: /^Talk to the outside/u }).click();
  const group = page.getByRole("radiogroup", { name: "Reply in the thread a request came from" });
  await expect(group.getByRole("radio", { name: "On" })).toBeChecked();
  await group.getByRole("radio", { name: "Ask" }).check();
  await shot(page, "manager-permissions", "both");
  await page.getByRole("button", { name: "Save permissions" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /^Talk to the outside/u }).click();
  await expect(
    page.getByRole("radiogroup", { name: "Reply in the thread a request came from" }).getByRole("radio", { name: "Ask" }),
  ).toBeChecked();
});

test("board settings add a lane and a field, and change the view the board opens on", async () => {
  await page.goto(at("settings/board"));
  await page.getByRole("button", { name: "Add a lane" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("QA");
  await page.getByRole("textbox", { name: "What it means" }).fill("A person tries it");
  await page.getByRole("button", { name: "Add lane" }).click();
  await expect(page.getByText("A person tries it")).toBeVisible();
  await page.getByRole("button", { name: "Add a field" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("Customer");
  await page.getByRole("button", { name: "Add field" }).click();
  await expect(page.getByRole("cell", { name: "Customer", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "The view the board opens on" }).click();
  await page.getByRole("option", { name: "List" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await shot(page, "manager-board-settings", "both");
  await page.reload();
  await expect(page.getByText("A person tries it")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Customer", exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "The view the board opens on" })).toContainText("List");
});

test("a task opens as a page where its words, owner, values and comments save", async () => {
  await page.goto(at(""));
  await page.getByRole("radio", { name: "Kanban" }).click();
  await page.getByText("Write the v2.3 changelog", { exact: true }).first().click();
  await page.getByRole("link", { name: "Open DT-1 as a page" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Write the v2.3 changelog" })).toBeVisible();
  await shot(page, "task-page", "both");
  await page.getByRole("textbox", { name: "Description" }).fill("One page for people who export data.");
  await page.getByRole("button", { name: "Save title and description" }).click();
  await expect(page.getByText("Saved", { exact: true }).first()).toBeVisible();
  await page.getByRole("textbox", { name: "Comment" }).fill("Marco asked for a row-limit note.");
  await page.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(page.getByText("Marco asked for a row-limit note.")).toBeVisible();
  await page.getByRole("combobox", { name: "Priority" }).click();
  await page.getByRole("option", { name: "high" }).click();
  await page.getByRole("combobox", { name: "Owner" }).click();
  await page.getByRole("option", { name: "Bea Builder" }).click();
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Saved", { exact: true })).toHaveCount(3);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Description" })).toHaveValue("One page for people who export data.");
  await expect(page.getByRole("combobox", { name: "Priority" })).toContainText("high");
  await expect(page.getByRole("combobox", { name: "Owner" })).toContainText("Bea Builder");
  await expect(page.getByText("Marco asked for a row-limit note.")).toBeVisible();
  await shot(page, "task-page-saved", "both");
});

test("an agent started on a task shows its run with a report and a transcript", async () => {
  await say(launch, "start a writer on DT-1 draft it", "run-1");
  await page.goto(at("tasks/DT-1"));
  await page
    .getByRole("link", { name: /writer/u })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 2, name: "Transcript" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Report" })).toBeVisible();
  await shot(page, "run-page", "both");
});

test("the manager's question shows in its chat as a card that opens its Inbox item", async () => {
  await say(launch, "ask me to decide on DT-1: Which date? 4th | 11th", "ask-1");
  await page.goto(at("chat"));
  await expect(page.getByText("Needs your answer")).toBeVisible();
  await shot(page, "chat-question", "both");
  await page.getByRole("link", { name: /Answer: / }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Which date/u })).toBeVisible();
});

test("events show what a source heard, what became of it and why it was ignored", async () => {
  await page.goto(at("settings/sources?source=github"));
  await page.getByRole("button", { name: "Connect GitHub" }).click();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.goto(at("settings/sources?source=github"));
  await page.getByRole("switch", { name: "acme/web" }).click();
  await page.getByRole("button", { name: "Save repos" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("switch", { name: "acme/web" })).toBeChecked();
  await shot(page, "manager-github", "both");

  const github = (await (await page.request.get(`/api/workspaces/${launch.workspaceId}/github`)).json()) as {
    github: { installation: { id: number } };
  };
  const pull = examples
    .find(({ name }) => name === "pull_request")
    ?.examples.find((one) => (one as { action?: string }).action === "opened");
  const payload = {
    ...(pull as object),
    installation: { id: github.github.installation.id },
    repository: { full_name: "acme/web", name: "web", owner: { login: "acme" } },
    sender: { id: 77, login: "stranger", type: "User" },
  };
  const body = JSON.stringify(payload);
  const sent = await page.request.post("/in/github", {
    data: body,
    headers: {
      "content-type": "application/json",
      "x-github-event": "pull_request",
      "x-github-delivery": "events-1",
      "x-hub-signature-256": await sign("fake-github-webhook-secret", body),
    },
  });
  expect(sent.ok()).toBe(true);
  await page.goto(at("events"));
  await expect(heading("Events")).toBeVisible();
  await expect(page.getByText(/Pull requests: not chosen for acme\/web/u).first()).toBeVisible();
  await shot(page, "manager-events", "both");
});

test("the templates start a manager that then has its own chat", async () => {
  await page.goto(`/ws/${launch.workspaceId}/build/templates`);
  await expect(heading("Templates")).toBeVisible();
  await shot(page, "build-templates", "both");
  await page.getByRole("button", { name: "Use the Incident desk template" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("Night desk");
  await page.getByRole("button", { name: "Start manager" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Chat" })).toBeVisible();
  await page.goto(`/ws/${launch.workspaceId}`);
  await expect(page.getByText("Night desk").first()).toBeVisible();
});
