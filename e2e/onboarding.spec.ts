import { expect, type Page, test } from "@playwright/test";
import { shot } from "./shots.ts";
import { lastMail, linkIn, signedIn } from "./team.ts";

/** The fake world's keys (src/modules/models/testing.ts). */
const WORKS = "sk-ant-test-works";

const heading = (page: Page, name: string) => page.getByRole("heading", { level: 1, name });
const press = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).click();
/** A line of Getting started that can still be done. */
const left = (page: Page, name: string) => page.getByRole("link", { name, exact: true });

async function read<T>(page: Page, path: string): Promise<T> {
  return (await (await page.request.get(path)).json()) as T;
}

test("ui:onboarding/first", async ({ browser }) => {
  // 1. Sign in: an account is made by the mailed link.
  const ama = await (await browser.newContext()).newPage();
  await ama.goto("/ws");
  await expect(heading(ama, "Sign in or create an account")).toBeVisible();
  await ama.getByRole("textbox", { name: "Email" }).fill("ama@first.test");
  await press(ama, "Email me a link");
  await expect(ama.getByText("We sent a link to ama@first.test")).toBeVisible();
  await shot(ama, "start-1-sign-in", "both");
  await ama.goto(linkIn(await lastMail(ama, "ama@first.test")));

  // 2. Create the workspace. Someone from the same company may join it.
  await expect(heading(ama, "Create your workspace")).toBeVisible();
  await ama.getByRole("textbox", { name: "Name" }).fill("First Co");
  await expect(ama.getByRole("textbox", { name: /^Address/u })).toHaveValue("first-co");
  await ama.getByRole("switch", { name: /Anyone at first.test can join/u }).click();
  await shot(ama, "start-2-workspace", "both");
  await press(ama, "Create workspace");
  await expect(heading(ama, "Connect a model")).toBeVisible();
  const id = /\/start\/([^/]+)\/model/u.exec(ama.url())?.[1] ?? "";
  expect(await read(ama, `/api/workspaces/${id}/join`)).toMatchObject({ domains: ["first.test"] });
  expect(await read(ama, `/api/workspaces/${id}`)).toMatchObject({ role: "owner", profile: { address: "first-co", region: "eu" } });

  // 3. A key that does not work is refused in the provider's words; then this is left for later.
  await expect(ama.getByRole("button", { name: "Continue" })).toBeDisabled();
  await ama.getByLabel("Anthropic API key").fill("sk-ant-wrong");
  await press(ama, "Add and test");
  await expect(ama.getByText(/The test call failed/u).first()).toBeVisible();
  await shot(ama, "start-3-model-failed", "both");
  await press(ama, "Do this later");

  // 4. What the first manager is for.
  await expect(heading(ama, "What should your first manager do?")).toBeVisible();
  await ama.getByText("Research desk").click();
  await expect(ama.getByRole("checkbox", { name: "Research desk" })).toBeChecked();
  await shot(ama, "start-4-manager", "both");
  await press(ama, "Continue");

  // 5. Its name and mission.
  await expect(heading(ama, "What should it get done?")).toBeVisible();
  await expect(ama.getByRole("textbox", { name: "Name" })).toHaveValue("Research");
  await ama.getByRole("textbox", { name: "Mission" }).fill("ask me: Which market should I look into first?");
  await shot(ama, "start-5-mission", "both");
  await press(ama, "Create manager");

  // 6. Where it hears about work: its email address is ready; the rest is left for later.
  await expect(heading(ama, "Where should it hear about work?")).toBeVisible();
  await expect(ama.getByText(/research\.first-co@/u)).toBeVisible();
  await shot(ama, "start-6-listen", "both");
  await press(ama, "Only its chat and email for now");

  // 7. Who else works on it: skipped too.
  await expect(heading(ama, "Who else works on this?")).toBeVisible();
  await press(ama, "Skip");

  // 8. The manager's chat, with its mission said and its first question asked. What was skipped is in Getting started.
  await expect(ama).toHaveURL(/\/m\/[^/]+\/chat$/u);
  const managerId = /\/m\/([^/]+)\/chat/u.exec(ama.url())?.[1] ?? "";
  await expect(ama.getByText("Which market should I look into first?").first()).toBeVisible();
  await expect(ama.getByText("Getting started · 2 of 6")).toBeVisible();
  for (const name of ["Connect a model", "Connect GitHub", "Invite your team", "Answer its first question"])
    await expect(left(ama, name)).toBeVisible();
  for (const name of ["Make a manager", "Email it"]) await expect(left(ama, name)).toHaveCount(0);
  await shot(ama, "start-8-chat", "both");
  await left(ama, "Mission").click();
  await expect(ama.getByText("ask me: Which market should I look into first?")).toBeVisible();

  // Each skipped step from Getting started, for real this time. A model:
  await left(ama, "Connect a model").click();
  await expect(heading(ama, "Connect a model")).toBeVisible();
  await ama.getByLabel("Anthropic API key").fill(WORKS);
  await press(ama, "Add and test");
  await expect(ama.getByText("Works", { exact: true })).toBeVisible();
  await shot(ama, "start-3-model", "both");
  await press(ama, "Continue");
  await expect(ama.getByText("Getting started · 3 of 6")).toBeVisible();

  // GitHub: install the App, come back, connect it, and pick a repo.
  await left(ama, "Connect GitHub").click();
  await press(ama, "Connect GitHub");
  await expect(heading(ama, "Connect GitHub to First Co")).toBeVisible();
  await shot(ama, "start-6-github-installed", "both");
  await press(ama, "Connect");
  await ama.getByRole("checkbox", { name: "acme/web" }).check();
  await expect
    .poll(() => read(ama, `/api/workspaces/${id}/github`))
    .toMatchObject({ github: { sources: [{ managerId, repo: "acme/web" }] } });
  await shot(ama, "start-6-github", "both");
  await press(ama, "Continue");

  // People: an invite, and a link.
  await expect(heading(ama, "Who else works on this?")).toBeVisible();
  await ama.getByRole("textbox", { name: "Emails" }).fill("bo@first.test, cy@elsewhere.test");
  await press(ama, "Make a link");
  await expect(ama.getByText(/\/join\/link\//u)).toBeVisible();
  await shot(ama, "start-7-invite", "both");
  await press(ama, "Send invites and finish");
  await expect(ama.getByText("Getting started · 5 of 6")).toBeVisible();
  expect(await lastMail(ama, "cy@elsewhere.test")).toContain("First Co");

  // Its first question: Getting started is done, and goes away.
  await left(ama, "Answer its first question").click();
  await ama.getByRole("cell", { name: /Which market should I look into first/u }).click();
  await ama.getByRole("textbox").last().fill("Canada");
  await ama.getByRole("button", { name: /^(Send|Answer)/u }).click();
  await expect(ama.getByText(/Getting started/u)).toHaveCount(0, { timeout: 20_000 });
  await shot(ama, "start-8-done", "both");

  // Someone else from the company finds the address taken, and asks to join. An Owner lets them in.
  const dee = await signedIn(browser, "dee@consulting.test", "Dee");
  await dee.goto("/ws");
  await dee.getByRole("textbox", { name: "Name" }).fill("First Co");
  await press(dee, "Create workspace");
  await expect(dee.getByText("first-co is taken")).toBeVisible();
  await shot(dee, "start-2-taken", "both");
  await press(dee, "Ask to join first-co");
  await expect(dee.getByText("Request sent")).toBeVisible();
  await shot(dee, "start-2-asked", "both");
  await ama.goto(`/ws/${id}/inbox`);
  await ama.getByRole("cell", { name: /Dee \(dee@consulting.test\) asks to join/u }).click();
  await shot(ama, "start-2-let-in", "both");
  await press(ama, "Let them in");
  await expect(dee.getByRole("link", { name: /First Co/u })).toBeVisible();
  await dee.getByRole("link", { name: /First Co/u }).click();
  await expect(heading(dee, "Inbox")).toBeVisible();
  await expect(dee.getByText(/Getting started/u)).toHaveCount(0);
});
