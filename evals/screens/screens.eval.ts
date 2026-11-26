import { expect, test, type Page } from "@playwright/test";
import { draw, main, open, ready } from "./kit.ts";
import { alike, looks, said } from "./like.ts";
import { SCREENS, type Screen } from "./screens.ts";

/* Each drawn screen: what it says, how it looks, on a phone, in the dark, by the keyboard, and how soon it is there. */

const SAYS = 0.9;
const LOOKS = 0.8;

async function both(page: Page, screen: Screen): Promise<{ readonly drawing: Page; readonly asked: readonly string[] }> {
  const drawing = await page.context().newPage();
  await drawing.emulateMedia(await page.evaluate(() => ({ colorScheme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" }) as const));
  await drawing.setViewportSize(page.viewportSize() ?? { width: 1440, height: 900 });
  await drawing.clock.install({ time: new Date("2026-11-25T08:54:00Z") });
  const asked = await open(page, screen);
  await draw(drawing, screen.id);
  return { drawing, asked };
}
const unknown = (asked: readonly string[]): string => `It asked for: ${[...new Set(asked)].join(", ")}`;

async function sameLook(page: Page, screen: Screen): Promise<void> {
  const { drawing, asked } = await both(page, screen);
  const [ours, drawn] = [await page.screenshot(), await drawing.screenshot()];
  const wide = (page.viewportSize()?.width ?? 0) > 1000 && screen.out === undefined && screen.then === undefined && !screen.page.startsWith("//");
  const share = await looks(drawing, ours, drawn, wide ? 256 : 0);
  await test.info().attach("ours", { body: ours, contentType: "image/png" });
  await test.info().attach("drawn", { body: drawn, contentType: "image/png" });
  expect(share, `${Math.round(share * 100)}% of it looks as drawn. ${unknown(asked)}`).toBeGreaterThanOrEqual(LOOKS);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "nothing scrolls sideways").toBe(true);
}

for (const screen of SCREENS) {
  test.describe(screen.id, () => {
    test(`screen:${screen.id}/says-what-is-drawn`, async ({ page }) => {
      const { drawing, asked } = await both(page, screen);
      const [ours, drawn] = [said(await (await main(page, screen)).ariaSnapshot()), said(await (await main(drawing, screen)).ariaSnapshot())];
      const { share, missing } = alike(ours, drawn);
      expect(share, `${Math.round(share * 100)}% of it says what is drawn. First missing: ${missing.slice(0, 6).join(" | ")}. ${unknown(asked)}`).toBeGreaterThanOrEqual(SAYS);
    });
    test(`screen:${screen.id}/looks-as-drawn`, ({ page }) => sameLook(page, screen));
    test.describe("on a phone", () => {
      test.use({ viewport: { width: 390, height: 844 } });
      test(`screen:${screen.id}/looks-as-drawn-on-a-phone`, ({ page }) => sameLook(page, screen));
    });
    test.describe("in the dark", () => {
      test.use({ colorScheme: "dark" });
      test(`screen:${screen.id}/looks-as-drawn-in-the-dark`, ({ page }) => sameLook(page, screen));
    });
    test(`screen:${screen.id}/by-the-keyboard-and-with-names`, async ({ page }) => {
      await open(page, screen);
      const controls = (await main(page, screen)).locator("button:visible, a[href]:visible, input:visible, textarea:visible, select:visible, [role=tab]:visible, [role=row][tabindex]:visible");
      expect(await controls.count(), "there is something to use").toBeGreaterThan(0);
      const bad = await controls.evaluateAll((all) =>
        all
          .filter((one) => {
            const name = one.getAttribute("aria-label") ?? one.getAttribute("aria-labelledby") ?? one.textContent ?? "";
            const labelled = "labels" in one && ((one as HTMLInputElement).labels?.length ?? 0) > 0;
            const group = one.closest("[role=tree],[role=treegrid]") ?? one.closest("[role=tablist],[role=radiogroup],[role=grid],[role=toolbar],[role=listbox],[role=menu],nav");
            // In a group the arrows move: one of it is in the order of Tab.
            const reach = (one as HTMLElement).tabIndex >= 0 || (group?.querySelector("[tabindex='0'],button:not([tabindex]),a[href]:not([tabindex])") ?? null) !== null;
            return (name.trim() === "" && !labelled && one.getAttribute("title") === null && one.getAttribute("placeholder") === null) || (!reach && !(one as HTMLButtonElement).disabled);
          })
          .map((one) => one.outerHTML.slice(0, 120)),
      );
      expect(bad, "has a name and can be reached").toEqual([]);
      await page.keyboard.press("Tab");
      const seen = await page.evaluate(() => {
        const one = document.activeElement;
        if (one === null || one === document.body) return false;
        const style = getComputedStyle(one);
        return style.outlineStyle !== "none" || style.boxShadow !== "none" || one.matches(":focus-visible");
      });
      expect(seen, "what has the focus shows it").toBe(true);
    });
  });
}

test("screen:shell/says-what-is-drawn", async ({ page }) => {
  const screen: Screen = { id: "m-coding-board", page: "/m/coding/board" };
  const { drawing } = await both(page, screen);
  const nav = (of: Page) => of.getByRole("navigation", { name: "Side navigation" });
  const { share, missing } = alike(said(await nav(page).ariaSnapshot()), said(await nav(drawing).ariaSnapshot()));
  expect(share, `First missing: ${missing.slice(0, 6).join(" | ")}`).toBeGreaterThanOrEqual(0.95);
});

test("screen:every/usable-within-a-second", async ({ page }) => {
  test.setTimeout(240_000);
  await open(page, { id: "m-coding-board", page: "/m/coding/board" });
  const slow: string[] = [];
  for (const screen of SCREENS.filter(({ reads, out, then, page: at }) => reads === undefined && out === undefined && then === undefined && !at.startsWith("//"))) {
    const took = await ready(page, screen);
    if (took > 1000) slow.push(`${screen.id} ${took} ms`);
  }
  expect(slow).toEqual([]);
});
