import { expect, type Page } from "@playwright/test";

/* Pressing and counting for the phone eval: what a person can click on a page, by name, and the way round a narrow screen. */

const CLICKABLE = /^\s*- (?:link|button|tab|radio|menuitem|menuitemradio|switch|checkbox|combobox|option) "((?:[^"\\]|\\.)*)"/u;

/** The names of everything that can be clicked, as the page shows it right now. */
export async function clickables(page: Page): Promise<ReadonlySet<string>> {
  const snapshot = await page.locator("body").ariaSnapshot();
  const names = snapshot.split("\n").flatMap((line) => {
    const name = CLICKABLE.exec(line)?.[1];
    return name === undefined || name === "" ? [] : [name.replace(/\\"/gu, '"')];
  });
  return new Set(names);
}

/** The same, once nothing is still loading in or out of the page: two looks, a moment apart, that agree. */
export async function settled(page: Page): Promise<ReadonlySet<string>> {
  let before = await clickables(page);
  for (let look = 0; look < 12; look += 1) {
    await page.waitForTimeout(300);
    const now = await clickables(page);
    if (now.size === before.size && [...now].every((name) => before.has(name))) return now;
    before = now;
  }
  return before;
}

/** Opens each menu on the page in turn, and adds what it offers. Menus closed again afterwards. */
export async function withMenus(page: Page, names: ReadonlySet<string>): Promise<ReadonlySet<string>> {
  const all = new Set(names);
  // A phone's choice of one opens as a sheet, which its trigger calls a dialog.
  // The shell's main is a role, not a `main` element.
  const triggers = page
    .getByRole("main")
    .locator('[aria-haspopup="menu"], [aria-haspopup="true"], [aria-haspopup="listbox"], [role="combobox"][aria-haspopup="dialog"]');
  const count = await triggers.count();
  for (let index = 0; index < count; index += 1) {
    const trigger = triggers.nth(index);
    if (!(await trigger.isVisible()) || !(await trigger.isEnabled())) continue;
    const isChoice = (await trigger.getAttribute("role")) === "combobox" && (await trigger.getAttribute("aria-readonly")) === null;
    await trigger.click();
    if (isChoice) await expect(page.getByRole("option").first()).toBeVisible();
    for (const name of await clickables(page)) all.add(name);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    if (isChoice) await expect(page.getByRole("option")).toHaveCount(0);
  }
  return all;
}

/** The navigation of a phone is behind a button; the desktop's sidebar is always there. */
export async function openNavigation(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Open navigation" }).press("Enter");
  await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
}

export async function closeNavigation(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Close navigation" }).press("Enter");
  await expect(page.getByRole("dialog", { name: "Navigation" })).toHaveCount(0);
}

/** Follows a link of the navigation, as a person would: open it, press the link. `under` is a manager's name. */
export async function through(page: Page, link: string | RegExp, under?: string): Promise<void> {
  await openNavigation(page);
  const drawer = page.getByRole("dialog", { name: "Navigation" });
  const place = under === undefined ? drawer : drawer.getByRole("group", { name: under });
  // Enter, not a mouse click: the drawer slides, and a click waits for it to hold still while the machine may be busy.
  await place
    .getByRole("link", { name: link, exact: typeof link === "string" })
    .first()
    .press("Enter");
  await expect(drawer).toHaveCount(0);
}

/** How far the page reaches past the screen's right edge. */
export const overflow = (page: Page): Promise<number> => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
