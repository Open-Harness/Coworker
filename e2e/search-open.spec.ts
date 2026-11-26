import { expect, test, type Page } from "@playwright/test";
import { acme } from "./acme.ts";
import { shot } from "./shots.ts";

/*
 * Search from the keyboard alone: its shortcut opens it, letters find, the arrow keys choose and Enter opens. Every
 * kind of result is found and opened that way, and each lands on the page it is about.
 */

/** Opens search with its shortcut, types, and moves down to the result named `result` with the arrow keys; Enter opens it. */
async function open(page: Page, query: string, result: string | RegExp, kind: string): Promise<void> {
  await page.keyboard.press("Control+k");
  const search = page.getByRole("dialog", { name: "Search" });
  await expect(search).toBeVisible();
  await page.keyboard.type(query);
  const group = search.getByRole("group", { name: kind });
  await expect(group).toBeVisible();
  const wanted = group.getByRole("option", { name: result });
  await expect(wanted).toBeVisible();
  for (let presses = 0; presses < 12 && (await wanted.getAttribute("data-highlighted")) === null; presses += 1) {
    await page.keyboard.press("ArrowDown");
  }
  await expect(wanted).toHaveAttribute("data-highlighted", "highlighted");
  await page.keyboard.press("Enter");
  await expect(search).toBeHidden();
}

test("ui:search/open", async ({ browser }) => {
  test.setTimeout(240_000);
  const { page, id, launch, incidents } = await acme(browser, "-search");
  const home = `/ws/${id}/inbox`;
  await page.goto(home);
  await expect(page.getByRole("heading", { level: 1, name: "Inbox" })).toBeVisible();

  // A task opens on its own page.
  await open(page, "150k row", /DT-2 Check a 150k row export/u, "Tasks");
  await expect(page).toHaveURL(new RegExp(`/ws/${id}/m/${launch.managerId}/tasks/DT-2$`, "u"));
  await expect(page.getByRole("heading", { name: "Check a 150k row export" }).first()).toBeVisible();

  // A mission page opens in the Mission, on that page.
  await open(page, "what we promised", /What we promised/u, "Mission pages");
  await expect(page).toHaveURL(new RegExp(`/ws/${id}/m/${launch.managerId}/mission\\?page=`, "u"));
  await expect(page.getByRole("heading", { level: 2, name: "What we promised" })).toBeVisible();

  // A manager opens on its board.
  await open(page, "incidents", /^Incidents/u, "Managers");
  await expect(page).toHaveURL(new RegExp(`/ws/${id}/m/${incidents.managerId}$`, "u"));
  await expect(page.getByRole("heading", { level: 1, name: "Board" })).toBeVisible();
  await expect(page.getByText("Checkout is slow in eu-west").first()).toBeVisible();

  // A person opens on the People page, where they are shown. So does someone only known by a handle.
  await open(page, "chidi", /Chidi Okafor/u, "People");
  await expect(page).toHaveURL(new RegExp(`/ws/${id}/people$`, "u"));
  await expect(page.getByRole("heading", { level: 1, name: "People" })).toBeVisible();
  await expect(page.getByText("Chidi Okafor").first()).toBeVisible();
  await open(page, "pat at", /pat@northwind.test/u, "People");
  await expect(page).toHaveURL(new RegExp(`/ws/${id}/people$`, "u"));
  await expect(page.getByText("pat@northwind.test").first()).toBeVisible();

  // What the results look like: tasks, a page and a person for one word, then a manager.
  for (const [query, name] of [
    ["northwind", "search-results"],
    ["launch", "search-managers"],
  ] as const) {
    await page.keyboard.press("Control+k");
    await page.keyboard.type(query);
    await expect(page.getByRole("dialog", { name: "Search" }).getByRole("option").nth(1)).toBeVisible();
    await shot(page, name, "both");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Search" })).toBeHidden();
  }
});
