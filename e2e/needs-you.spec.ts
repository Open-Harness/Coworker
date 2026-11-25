import { expect, test } from "@playwright/test";
import { hasTask, say, signedIn, team } from "./team.ts";

const QUESTION = "Should the v2.3 export docs promise no row limit, or a 150k limit?";
const OPTIONS = ["150k limit for v2.3", "No limit, hold the date", "No limit, move the release a week"];

test("ui:needs-you/page", async ({ browser }) => {
  const launch = await team(await signedIn(browser, "needs@example.test"), "needsteam");
  await say(launch, "add a task: Document streaming CSV export", "add-1");
  await hasTask(launch, "Document streaming CSV export");
  await say(launch, `ask me to decide on DT-1: ${QUESTION} ${OPTIONS.join(" | ")}`, "decide-1");
  const { page } = launch;
  let itemId = "";
  await expect
    .poll(async () => {
      const body = (await (await page.request.get(`/api/workspaces/${launch.workspaceId}/inbox`)).json()) as { items: { id: string }[] };
      itemId = body.items[0]?.id ?? "";
      return itemId;
    })
    .not.toBe("");

  await page.goto(`/ws/${launch.workspaceId}/inbox/${encodeURIComponent(itemId)}`);
  await expect(page.getByRole("heading", { level: 1, name: QUESTION })).toBeVisible();
  await expect(page.getByText("Question about DT-1")).toBeVisible();
  // The decision and its context.
  await expect(page.getByRole("heading", { name: "What you're deciding" })).toBeVisible();
  await expect(page.getByText("The manager won't pick this alone", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What the manager knows" })).toBeVisible();
  await expect(page.getByText("The task is on the board.")).toBeVisible();
  // The options, the manager's pick first.
  await expect(page.getByText(/^Why the manager recommends A:/u)).toBeVisible();
  for (const [index, option] of OPTIONS.entries()) {
    await expect(page.getByRole("heading", { name: `${"ABC"[index]} · ${option}` })).toBeVisible();
    await expect(page.getByRole("button", { name: `Choose ${"ABC"[index]}` })).toBeVisible();
  }
  await expect(page.getByText("Manager recommends", { exact: true })).toBeVisible();
  await expect(page.getByLabel(/Or answer in your own words/u)).toBeVisible();
  // The pages and tasks to read.
  await expect(page.getByRole("heading", { name: "Read more" })).toBeVisible();
  await expect(page.getByRole("link", { name: /DT-1 Document streaming CSV export/u })).toBeVisible();
  await expect(page.getByText("Mission page · Mission")).toBeVisible();
  await page.screenshot({ path: "test-results/shots/needs-you.png", fullPage: true });

  await page.getByRole("button", { name: "Choose A" }).click();
  await expect(page.getByText(`answered: ${OPTIONS[0]}`, { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose B" })).toBeDisabled();
});
