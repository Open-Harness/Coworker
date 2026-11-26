import { expect, type Page } from "@playwright/test";
import type { Failing } from "./access-failures.ts";
import type { Ids } from "./access-table.ts";

/** A page that has to load can be slow when the machine is busy. */
export const check = expect.configure({ timeout: 40_000 });

/** Fails every request the row names until `heal` is called. */
export async function breakIt(page: Page, row: Failing, ids: Ids): Promise<{ readonly heal: () => void }> {
  const target = row.breaks(ids);
  let isBroken = true;
  await page.route(
    (url) => (typeof target === "string" ? url.pathname === target : target.test(url.pathname)),
    (route) => {
      if (!isBroken || route.request().method() !== "GET") return route.fallback();
      return row.how === "drop" ? route.abort() : route.fulfill({ status: 500, json: { error: "The server broke" } });
    },
  );
  return { heal: () => void (isBroken = false) };
}

/** The page says it did not load and offers "Try again"; pressing it brings the content back. */
export async function recovers(page: Page, row: Failing, heal: () => void, whileFailed?: () => Promise<void>): Promise<void> {
  const where = `${row.name}`;
  await check(page.getByText(row.says).first(), `${where} says it did not load`).toBeVisible();
  await check(page.getByText(/server/iu).first(), `${where} says why`).toBeVisible();
  const again = page.getByRole("button", { name: "Try again" }).first();
  await check(again, `${where} offers to try again`).toBeVisible();
  await whileFailed?.();
  heal();
  await again.click();
  await check(page.getByText(row.says), `${where} loaded after trying again`).toHaveCount(0);
  await check(page.getByRole("heading", { name: row.shows }).first(), `${where} shows ${row.shows}`).toBeVisible();
}
