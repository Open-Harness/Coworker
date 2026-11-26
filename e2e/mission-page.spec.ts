import { expect, test, type Page } from "@playwright/test";
import { acme } from "./acme.ts";
import { api } from "./settings.ts";
import { shot } from "./shots.ts";
import { signedIn } from "./team.ts";

/*
 * The mission page and the pages under it: read, edited by a person through the action the manager shares, kept after a
 * reload, and always saying who changed it last. Two people editing at once never lose a word silently.
 */

const TAG = "-mission";

/** Edits the page open on screen: Edit, new text, Save. */
async function rewrite(page: Page, text: string): Promise<void> {
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("textbox", { name: "Page text" }).fill(text);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Page text" })).toBeHidden();
}

test("ui:mission/page", async ({ browser }) => {
  test.setTimeout(240_000);
  const { page, id, launch } = await acme(browser, TAG);
  const bo = await signedIn(browser, `bo.larsen${TAG}@acme.test`, "Bo Larsen");
  const chidi = await signedIn(browser, `chidi.okafor${TAG}@acme.test`, "Chidi Okafor");
  const mission = `/ws/${id}/m/${launch.managerId}/mission`;

  // Reading: the mission first, with who wrote it, and a page under it.
  await page.goto(mission);
  await expect(page.getByRole("heading", { level: 1, name: "Mission" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Launch" })).toBeVisible();
  await expect(page.getByText(/^Updated by \S/u)).toBeVisible();
  await page.getByRole("link", { name: /What we promised/u }).click();
  await expect(page.getByRole("heading", { level: 2, name: "What we promised" })).toBeVisible();
  await expect(page.getByText("no row limit").first()).toBeVisible();
  await expect(page.getByText(/^Updated by Launch /u)).toBeVisible();
  const promised = `${mission}?page=${new URL(page.url()).searchParams.get("page")}`;

  // Editing the mission: the text and the name of whoever saved it are what the server kept, also after a reload.
  await page.getByRole("link", { name: /^Launch Mission/u }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("textbox", { name: "Page text" }).fill("# Launch\n\nShip v2.3 on the 14th.\n\n- Exports have no row limit");
  await shot(page, "mission-edit", "both");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Ship v2.3 on the 14th.")).toBeVisible();
  await expect(page.getByText(/^Updated by Ama Mensah /u)).toBeVisible();
  await page.reload();
  await expect(page.getByText("Ship v2.3 on the 14th.")).toBeVisible();
  await expect(page.getByText(/^Updated by Ama Mensah /u)).toBeVisible();

  // Someone else edits the page under it, and Ama sees their name, not an id.
  await bo.goto(promised);
  await rewrite(bo, "Northwind was told exports have **no row limit**.\n\n- Support answers within a day");
  await expect(bo.getByText(/^Updated by Bo Larsen /u)).toBeVisible();
  await page.goto(promised);
  await expect(page.getByText(/^Updated by Bo Larsen /u)).toBeVisible();

  // Two people at once: Ama is editing when Bo saves. Her words stay in the box, and nothing of Bo's is replaced unasked.
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("textbox", { name: "Page text" }).fill("Northwind was told exports have no row limit, in writing.");
  await rewrite(bo, "Northwind was told exports have **no row limit**.\n\n- Support answers within two days");
  const warning = page.getByText("Bo Larsen changed this page while you were editing");
  await expect(warning).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Page text" })).toHaveValue("Northwind was told exports have no row limit, in writing.");
  await shot(page, "mission-conflict", "both");
  await page.getByRole("button", { name: "Replace their version" }).click();
  await expect(page.getByText("in writing.")).toBeVisible();
  await expect(page.getByText(/^Updated by Ama Mensah /u)).toBeVisible();

  // The server refuses a save that began from an older version, in plain words, and keeps what is there.
  const stale = await page.request.post(`${launch.api}/actions/page.update`, {
    data: { input: { page: new URL(promised, page.url()).searchParams.get("page"), body: "Lost?", base: 1 }, requestId: "stale" },
    headers: { origin: new URL(page.url()).origin },
  });
  expect(((await stale.json()) as { value: { ok: boolean; message: string } }).value).toMatchObject({
    ok: false,
    message: expect.stringContaining("changed"),
  });
  await page.reload();
  await expect(page.getByText("in writing.")).toBeVisible();
  await expect(page.getByText("Lost?")).toBeHidden();

  // Permissions: an Owner takes page editing from Chidi. He still reads, and the server refuses him, but he edits the mission.
  await api(page, "PUT", `/api/workspaces/${id}/permissions`, {
    person: `email:chidi.okafor${TAG}@acme.test`,
    scope: "action",
    key: "page.update",
    value: "off",
  });
  await chidi.goto(promised);
  await expect(chidi.getByRole("heading", { level: 2, name: "What we promised" })).toBeVisible();
  await expect(chidi.getByText("in writing.")).toBeVisible();
  await expect(chidi.getByRole("button", { name: "Edit", exact: true })).toBeHidden();
  await expect(chidi.getByText("An Owner has not let you edit it.")).toBeVisible();
  await shot(chidi, "mission-page-read-only", "both");
  const refused = await chidi.request.post(`${launch.api}/actions/page.update`, {
    data: { input: { page: new URL(promised, chidi.url()).searchParams.get("page"), body: "Mine" }, requestId: "refused" },
    headers: { origin: new URL(chidi.url()).origin },
  });
  expect(refused.status()).toBe(403);
  await chidi.goto(mission);
  await expect(chidi.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
  await shot(page, "mission-page", "both");
});
