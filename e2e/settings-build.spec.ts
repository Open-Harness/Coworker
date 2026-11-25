import { expect, test, type Page } from "@playwright/test";
import { shot } from "./shots.ts";
import { signedIn, team, type Team } from "./team.ts";

/* The workspace's agents and skills: made, saved as new versions, kept after a reload, and deleted after a confirmation. */

test.describe.configure({ mode: "serial" });
let launch: Team;
let page: Page;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  page = await signedIn(browser, "builds@example.test", "Bea Builder");
  launch = await team(page, "buildspace");
});

const heading = (name: string) => page.getByRole("heading", { level: 1, name, exact: true });

test("an agent is made, saved as a new version, kept after a reload and deleted after a confirmation", async () => {
  await page.goto(`/ws/${launch.workspaceId}/build/agents`);
  await expect(heading("Agents")).toBeVisible();
  await page.getByRole("link", { name: "New agent" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("Docs writer");
  await page.getByRole("textbox", { name: "Instructions" }).fill("You write product documentation.");
  await page.getByRole("button", { name: "Create agent" }).click();
  await expect(page.getByRole("link", { name: /Docs writer/u })).toBeVisible();
  await page.getByRole("textbox", { name: "Instructions" }).fill("You write product documentation. Describe behaviour, not code.");
  await page.getByRole("textbox", { name: "What changed" }).fill("Added the behaviour rule");
  await page.getByRole("button", { name: "Save as v2" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await shot(page, "build-agents", "both");
  await expect(page.getByRole("textbox", { name: "Instructions" })).toHaveValue(
    "You write product documentation. Describe behaviour, not code.",
  );
  await expect(page.getByText(/Added the behaviour rule/u)).toBeVisible();
  await page.getByRole("button", { name: "Delete agent" }).click();
  await page.getByRole("button", { name: "Delete agent" }).last().click();
  await expect(page.getByRole("link", { name: /Docs writer/u })).toHaveCount(0);
});

test("a skill is made with a second file, saved and kept after a reload", async () => {
  await page.goto(`/ws/${launch.workspaceId}/build/skills`);
  await expect(heading("Skills")).toBeVisible();
  await page.getByRole("link", { name: "New skill" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("page-reader");
  await page
    .getByRole("textbox", { name: "SKILL.md" })
    .fill(
      "---\nname: page-reader\ndescription: Read web pages that need a browser. Use when a plain fetch comes back empty.\n---\n\n# Page reader\n",
    );
  await page.getByRole("textbox", { name: "New file" }).fill("scripts/read.js");
  await page.getByRole("button", { name: "Add file" }).click();
  await page.getByRole("textbox", { name: "scripts/read.js" }).fill("console.log('read');");
  await page.getByRole("button", { name: "Create skill" }).click();
  await expect(page.getByRole("link", { name: /page-reader/u })).toBeVisible();
  await page.reload();
  await shot(page, "build-skills", "both");
  await page
    .getByRole("button", { name: "scripts/read.js" })
    .or(page.getByText("scripts/read.js", { exact: true }))
    .first()
    .click();
  await expect(page.getByRole("textbox", { name: "scripts/read.js" })).toHaveValue("console.log('read');");
});
