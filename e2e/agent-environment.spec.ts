import { expect, test, type Page } from "@playwright/test";
import { api, choose, toast } from "./settings.ts";
import { signedIn, workspace } from "./team.ts";

/* Where an agent runs is one of its settings, from its own form and from the Environments page alike. */

test.describe.configure({ mode: "serial" });
let page: Page;
let id: string;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  page = await signedIn(browser, "moves@example.test", "Mo Mover");
  id = await workspace(page, "movespace");
  await api(page, "PUT", `/api/workspaces/${id}/environments`, { name: "Web app", setup: "pnpm install", size: "2 vCPU · 4 GB" });
});

const field = (name: string) => page.getByRole("combobox", { name });

test("an agent is made with every setting and keeps them after a reload", async () => {
  await page.goto(`/ws/${id}/build/agents?item=new`);
  await page.getByRole("textbox", { name: "Name" }).fill("Docs writer");
  await page.getByRole("textbox", { name: "Instructions" }).fill("You write product documentation.");
  await page.getByRole("radio", { name: "High" }).click();
  await page.getByRole("checkbox", { name: /bash/u }).check();
  await choose(page, "Environment", "Web app");
  await page.getByRole("button", { name: "Create agent" }).click();
  await expect(page.getByRole("button", { name: "Save as v2" })).toBeVisible();
  await page.reload();
  await expect(field("Environment")).toContainText("Web app");
  await expect(page.getByRole("radio", { name: "High" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /bash/u })).toBeChecked();
});

test("an agent whose name has a space is moved from the Environments page, as a new version", async () => {
  await page.goto(`/ws/${id}/build/agents`);
  await page.getByRole("link", { name: /Docs writer/u }).click();
  await choose(page, "Environment", "None: the plain container");
  await page.getByRole("button", { name: "Save as v2" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await page.goto(`/ws/${id}/environments`);
  await page.getByRole("button", { name: "Edit Web app" }).click();
  await choose(page, /^Agent to run here/u, "Docs writer");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(toast(page, "Docs writer runs here now")).toBeVisible();

  await page.goto(`/ws/${id}/build/agents`);
  await page.getByRole("link", { name: /Docs writer.*Version 3/u }).click();
  await expect(field("Environment")).toContainText("Web app");
  await expect(page.getByText(/Runs in Web app/u)).toBeVisible();
});
