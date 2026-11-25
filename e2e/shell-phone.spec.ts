import { expect, test, type Page } from "@playwright/test";
import { acme } from "./acme.ts";
import { STOPS, type Stop } from "./phone-stops.ts";
import { closeNavigation, openNavigation, overflow, settled, withMenus } from "./phone-walk.ts";
import { api } from "./settings.ts";
import { shot } from "./shots.ts";

/*
 * Every page of the app, first as a person on a phone reaches it, by pressing through the navigation, then at a desk. On
 * the phone nothing may scroll sideways; and everything that can be clicked at the desk (a button, a link, a tab, by its
 * name) must be there on the phone, on the page or in a menu the test opens: the navigation, or a page's own menus.
 */

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

const opens = async (page: Page, { heading }: Stop): Promise<void> => {
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Loading" })).toHaveCount(0);
};

/** What a person can click on the phone: the page, its menus, and the navigation. */
async function onPhone(page: Page, name: string): Promise<ReadonlySet<string>> {
  expect(await overflow(page), `${name} scrolls sideways on a phone`).toBeLessThanOrEqual(0);
  const names = new Set(await withMenus(page, await settled(page)));
  await openNavigation(page);
  // What setting up has left to do loads after the rest, and settings have no such section: wait for it, so that the drawer is whole.
  const drawer = page.getByRole("dialog", { name: "Navigation" });
  if ((await drawer.getByRole("link", { name: /^Back to / }).count()) === 0)
    await expect(drawer.getByText(/Getting started/u)).toBeVisible({ timeout: 40_000 });
  for (const link of await settled(page)) names.add(link);
  await closeNavigation(page);
  return names;
}

test("ui:shell/phone", async ({ browser }) => {
  test.setTimeout(900_000);
  expect(new Set(STOPS.map(({ name }) => name)).size, "Every stop has its own name").toBe(STOPS.length);
  const { page, id } = await acme(browser, "-ph");
  page.setDefaultTimeout(40_000);
  // An agent and a skill to open: the lived-in workspace has none of its own.
  await api(page, "POST", `/api/workspaces/${id}/agents`, {
    config: { name: "Reviewer", instructions: "You review changes.", thinking: "medium", tools: [], skills: [], model: null },
  });
  await api(page, "POST", `/api/workspaces/${id}/skills`, {
    name: "release-notes",
    files: { "SKILL.md": "---\nname: release-notes\ndescription: Writes release notes\n---\nWrite short notes." },
  });
  const addresses = new Map<string, string>();
  const phone = new Map<string, ReadonlySet<string>>();

  await page.setViewportSize(PHONE);
  await page.goto(`/ws/${id}/inbox`);
  let last = page.url();
  for (const stop of STOPS) {
    await stop.go?.(page);
    await opens(page, stop);
    if (stop.go !== undefined) last = page.url();
    addresses.set(stop.name, last);
    await stop.onPage?.(page);
    await opens(page, stop);
    // A workspace's page has the navigation behind a button; the list of workspaces has none.
    phone.set(stop.name, stop.name === "Your workspaces" ? new Set(await settled(page)) : await onPhone(page, stop.name));
    expect(await overflow(page), `${stop.name} scrolls sideways on a phone`).toBeLessThanOrEqual(0);
  }

  await page.setViewportSize(DESKTOP);
  const missing: string[] = [];
  for (const stop of STOPS) {
    await page.goto(addresses.get(stop.name) ?? "");
    await stop.onPage?.(page);
    await opens(page, stop);
    const desk = await withMenus(page, await settled(page));
    const there = new Set([...(phone.get(stop.name) ?? []), ...(phone.get(stop.alsoFrom ?? "") ?? [])]);
    const has = (name: string): boolean => {
      const other = stop.does?.[name];
      return there.has(name) || (other !== undefined && [...there].some((one) => other.test(one)));
    };
    for (const name of desk) if (!has(name)) missing.push(`${stop.name}: ${name}`);
    await shot(page, `phone-${stop.name.toLowerCase().replace(/[^a-z0-9]+/gu, "-")}`, "both");
  }
  expect(phone.size, "Every page was walked on the phone").toBe(STOPS.length);
  expect(missing, "What can be clicked at a desk but not on a phone").toEqual([]);
});
