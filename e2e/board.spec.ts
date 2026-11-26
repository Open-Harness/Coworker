import { expect, test } from "@playwright/test";
import { boardPath, hasTask, say, signedIn, team } from "./team.ts";

const TITLES = ["Write the v2.3 changelog", "Check a 150k row export", "Reply to Northwind"];

test("ui:manager/board", async ({ browser }) => {
  const launch = await team(await signedIn(browser, "board@example.test"), "boardteam");
  for (const [index, title] of TITLES.entries()) {
    await say(launch, `add a task: ${title}`, `add-${index}`);
    await hasTask(launch, title);
  }
  const { page } = launch;
  await page.goto(boardPath(launch));
  await expect(page.getByRole("heading", { level: 1, name: "Board" })).toBeVisible();
  await expect(page.getByText("3 tasks · 0 agents working")).toBeVisible();
  for (const view of ["Kanban", "List", "Console", "Inbox"]) {
    await page.getByRole("radio", { name: view }).click();
    for (const title of TITLES) await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: `test-results/shots/board-${view.toLowerCase()}.png`, fullPage: true });
  }
});
