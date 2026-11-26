import { expect, type Page } from "@playwright/test";

/** Picks one option of a selector by the selector's own label; a selector with a search box is searched first. */
export async function choose(page: Page, label: string | RegExp, option: string | RegExp, search?: string): Promise<void> {
  await page
    .getByRole("combobox", { name: label, exact: typeof label === "string" && search === undefined })
    .or(page.getByRole("button", { name: label }))
    .first()
    .click();
  if (search !== undefined) await page.keyboard.type(search);
  await page.getByRole("option", { name: option }).first().click();
}

/** Presses a save button and waits for the screen to say it worked. */
export async function save(page: Page, label = "Save changes"): Promise<void> {
  await page.getByRole("button", { name: label }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
}

/** A download started by `start`, by the name the server gave it. */
export async function downloaded(page: Page, start: () => Promise<void>): Promise<string> {
  const [download] = await Promise.all([page.waitForEvent("download"), start()]);
  return download.suggestedFilename();
}

/** Opens a settings page of the workspace and waits for its heading. */
export async function openSettings(page: Page, id: string, path: string, heading: string): Promise<void> {
  await page.goto(`/ws/${id}/settings/${path}`);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
}

/** Reloads the page, so that what is shown afterwards is what the server kept. */
export async function reloaded(page: Page, heading: string): Promise<void> {
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
}

/** One call to the app's own API, as the signed-in person. */
export async function api<T = unknown>(page: Page, method: "POST" | "PUT" | "DELETE", path: string, data?: unknown): Promise<T> {
  const response = await page.request.fetch(path, { method, data, headers: { origin: new URL(page.url()).origin } });
  expect(response.ok(), `${method} ${path} answered ${response.status()}: ${await response.text()}`).toBe(true);
  return (await response.json()) as T;
}

/** The toast that says something, as people see it. */
export const toast = (page: Page, text: string) => page.getByRole("region", { name: "Notifications" }).getByText(text, { exact: true });

/** A tab of a screen, however Astryx names its role. */
export const tab = (page: Page, name: string | RegExp) => page.getByRole("tab", { name }).or(page.getByRole("button", { name }));
