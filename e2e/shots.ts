import { expect, type Page } from "@playwright/test";

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

async function capture(page: Page, name: string): Promise<void> {
  await page.mouse.move(0, 0);
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((animation) => animation.playState !== "running" || animation.effect?.getComputedTiming().iterations === Infinity),
  );
  await page.waitForTimeout(300);
  await page.screenshot({ path: `test-results/shots/${name}.png` });
}

/**
 * A screenshot of what a person sees once everything that moves has stopped, on a phone too for `both`, where nothing
 * may be wider than the screen.
 */
export async function shot(page: Page, name: string, on: "desktop" | "both" = "desktop"): Promise<void> {
  await capture(page, name);
  if (on === "desktop") return;
  await page.setViewportSize(PHONE);
  await capture(page, `${name}-phone`);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over, `${name} is ${over}px wider than a phone`).toBeLessThanOrEqual(0);
  await page.setViewportSize(DESKTOP);
}
