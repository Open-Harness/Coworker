import { expect, test, type Locator, type Page } from "@playwright/test";
import type { ChatView } from "~/modules/views-workspace/types.ts";
import { WALK } from "./fixtures/making.ts";
import { AT } from "./fixtures/index.ts";
import { open, settled } from "./kit.ts";
import type { Screen } from "./screens.ts";

/*
 * The co-worker in front of you (spec C7, drawing `live`): on Sales's Triggers it goes to the page, points, says what it is about to do,
 * does it, and stops before saving. `POST /walk` answers the steps (`WALK` in fixtures/making.ts); the page plays them.
 * What the page must have, so that this can find it: the pointer is `data-testid="juno-pointer"`; what it says is in a live region
 * (`role=status`); a bar with *Stop* and *Skip to the end*; the palette entry *Show me how*; in the chat a *Show me* beside a doing.
 */

const SCREEN: Screen = { id: "live", page: "/m/sales/playbook/triggers" };
const LAST = WALK.length - 1;
const STEP = (n: number) => WALK[n]?.say ?? "";
const LIVE = '[role=status], [role=alert], [aria-live="polite"], [aria-live="assertive"]';

/** What every live region of the page says now. */
const said = async (page: Page): Promise<string> => (await page.locator(LIVE).allInnerTexts()).join("\n");
const editor = (page: Page): Locator => page.getByRole("dialog", { name: /look for signs/i });
const control = (page: Page, name: string): Locator =>
  page
    .getByRole("button", { name, exact: true })
    .or(page.getByRole("textbox", { name, exact: true }))
    .or(page.getByRole("combobox", { name, exact: true }));
const posted = (page: Page): readonly string[] => {
  const seen: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST")
      seen.push(`${new URL(request.url()).pathname.replace(/^\/api\/ws\/[^/]+/u, "")} ${request.postData() ?? ""}`);
  });
  return seen;
};
const did = (seen: readonly string[], doing: string): readonly string[] =>
  seen.filter((one) => one.startsWith("/do ") && one.includes(`"${doing}"`));

/** Lets the page's own time go by, in small steps, until what is asked for is so. */
async function until(page: Page, what: string, check: () => Promise<boolean>, seconds = 120): Promise<void> {
  for (let spent = 0; spent <= seconds * 1000; spent += 250) {
    if (await check()) return;
    await page.clock.runFor(250);
    await page.waitForTimeout(20);
  }
  throw new Error(`Never: ${what}. It said: ${await said(page)}`);
}
const reaches = (page: Page, n: number) => until(page, `it says “${STEP(n)}”`, async () => (await said(page)).includes(STEP(n)));

/** The person asks to be shown, by the palette: nothing is done until the steps have been read out. */
async function show(page: Page): Promise<void> {
  await open(page, SCREEN);
  await page.keyboard.press("ControlOrMeta+k");
  const palette = page.getByRole("dialog");
  await palette.getByRole("combobox").or(palette.getByRole("textbox")).first().fill("show me how");
  await palette
    .getByRole("option", { name: /show me how/i })
    .or(palette.getByRole("button", { name: /show me how/i }))
    .first()
    .click();
  await settled(page);
}

/** Where the pointer is, against where the control is: they must touch. */
async function pointsAt(page: Page, target: Locator): Promise<boolean> {
  const [pointer, box] = [await page.getByTestId("juno-pointer").boundingBox(), await target.boundingBox()];
  if (pointer === null || box === null) return false;
  return (
    pointer.x < box.x + box.width &&
    pointer.x + pointer.width > box.x &&
    pointer.y < box.y + box.height &&
    pointer.y + pointer.height > box.y
  );
}

test("screen:live/shows-what-it-is-about-to-do-before-doing-it", async ({ page }) => {
  await show(page);
  await reaches(page, 2);
  expect(await editor(page).count(), "it has said it will press the pencil, and the form is not open yet").toBe(0);
  await until(page, "the form opens", async () => (await editor(page).count()) > 0);
  await reaches(page, 3);
  expect(await editor(page).getByLabel("When").inputValue(), "it has said what it will change When to, and has not typed it yet").not.toBe(
    WALK[3]?.value,
  );
  await until(page, "it has typed it", async () => (await editor(page).getByLabel("When").inputValue()) === WALK[3]?.value);
});

test("screen:live/moves-the-pointer-to-the-control-it-names", async ({ page }) => {
  await show(page);
  for (const [n, step] of WALK.entries()) {
    if (step.at.press === null) continue;
    await reaches(page, n);
    const target = control(page, step.at.press);
    await until(page, `the pointer is at ${step.at.press}`, () => pointsAt(page, target), 10);
  }
});

test("screen:live/stop-stops-with-nothing-pressed-after", async ({ page }) => {
  const seen = posted(page);
  await show(page);
  await reaches(page, 1);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  const [then, form] = [await said(page), await editor(page).count()];
  await page.clock.runFor(60_000);
  await settled(page);
  expect(await editor(page).count(), "the pencil was not pressed after Stop").toBe(form);
  expect(await said(page), "it says nothing more").toBe(then);
  expect(did(seen, "version.save"), "nothing was saved").toEqual([]);
  expect(await page.getByRole("button", { name: /save as version 7/i }).isDisabled(), "the page is as it was: nothing changed").toBe(true);
});

test("screen:live/skip-to-the-end-goes-straight-to-the-step-that-is-yours", async ({ page }) => {
  const seen = posted(page);
  await show(page);
  await reaches(page, 0);
  await page.getByRole("button", { name: /skip to the end/i }).click();
  await until(page, "it is at the step that is yours", async () => (await said(page)).includes(STEP(LAST)), 5);
  expect(WALK[LAST]?.yours, "the last of the walk is the person's").toBe(true);
  expect(await editor(page).count(), "what it skipped is done: the form is kept").toBe(0);
  await expect(page.getByText(WALK[3]?.value ?? "").first(), "and the page has the change").toBeVisible();
  await expect(page.getByRole("button", { name: /save as version 7/i })).toBeEnabled();
  expect(await pointsAt(page, page.getByRole("button", { name: /save as version 7/i })), "the pointer is at Save").toBe(true);
  expect(did(seen, "version.save"), "it did not save").toEqual([]);
});

test("screen:live/stops-before-saving-and-nothing-is-saved-until-a-person-presses-it", async ({ page }) => {
  const seen = posted(page);
  await show(page);
  await reaches(page, LAST);
  await page.clock.runFor(60_000);
  expect(await said(page), "it waits for the person: it has not gone on").toContain(STEP(LAST));
  expect(did(seen, "version.save"), "a minute after it has asked, nothing is saved").toEqual([]);
  const asked = page.waitForRequest((request) => request.method() === "POST" && request.url().endsWith("/do"));
  await page.getByRole("button", { name: /save as version 7/i }).click();
  expect(JSON.parse((await asked).postData() ?? "{}"), "the person's press is the one save").toMatchObject({ doing: "version.save" });
  expect(did(seen, "version.save")).toHaveLength(1);
});

test("screen:live/announces-every-step-to-a-screen-reader", async ({ page }) => {
  await open(page, SCREEN);
  await page.evaluate((selector) => {
    const heard: string[] = [];
    Object.assign(window, { heard });
    const note = (node: Node | null) => {
      const element = node instanceof Element ? node : (node?.parentElement ?? null);
      const live = element?.closest(selector) ?? (element?.matches(selector) ? element : element?.querySelector(selector));
      const text = live?.textContent?.trim() ?? "";
      if (text !== "" && !heard.includes(text)) heard.push(text);
    };
    new MutationObserver((all) => {
      for (const one of all) {
        note(one.target);
        one.addedNodes.forEach(note);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
  }, LIVE);
  await page.keyboard.press("ControlOrMeta+k");
  const palette = page.getByRole("dialog");
  await palette.getByRole("combobox").or(palette.getByRole("textbox")).first().fill("show me how");
  await palette
    .getByRole("option", { name: /show me how/i })
    .or(palette.getByRole("button", { name: /show me how/i }))
    .first()
    .click();
  await reaches(page, LAST);
  const heard = await page.evaluate(() => (window as unknown as { heard: string[] }).heard);
  const missed = WALK.map((step) => step.say).filter((words) => !heard.some((one) => one.includes(words)));
  expect(missed, "each sentence was put in a live region, so that it was read out").toEqual([]);
});

test("screen:live/a-reply-of-the-co-worker-can-show-how", async ({ page }) => {
  const seen = posted(page);
  const chat: ChatView = {
    chat: {
      id: "tuesday",
      title: "Mondays",
      with: "Ama Mensah",
      where: "Here",
      last: AT.getTime(),
      state: "waits",
      waitsFor: "ama",
      under: null,
      knew: null,
    },
    lines: [
      {
        id: "l1",
        at: AT.getTime() - 60_000,
        by: { person: "ama" },
        text: "Bo is away on Mondays until Christmas. Don’t look for signs then.",
        did: [],
        from: [],
        calls: [],
      },
      {
        id: "l2",
        at: AT.getTime(),
        by: "coworker",
        text: "Yes. I can change when Look for signs runs. I can show you where, on the screen.",
        did: [
          {
            doing: "trigger.edit",
            says: "Change when Look for signs runs to Tuesday to Friday",
            link: null,
            state: "waits for you",
            showMe: { doing: "trigger.edit", values: { trigger: "signs", when: WALK[3]?.value ?? "" } },
          },
        ],
        from: [],
        calls: [],
      },
    ],
    forks: [],
  };
  await open(page, SCREEN);
  await page.route("**/api/ws/*/chats", (route) => route.fulfill({ json: { chat: "tuesday" } }));
  await page.route("**/api/ws/*/chats/tuesday", (route) => route.fulfill({ json: chat }));
  const talk = page.getByRole("textbox", { name: /tell juno|talk to juno|message/i }).last();
  await talk.fill("Bo is away on Mondays until Christmas. Don’t look for signs then.");
  await talk.press("Enter");
  await page
    .getByRole("button", { name: /show me/i })
    .first()
    .click();
  await reaches(page, 0);
  const asked = seen.find((one) => one.startsWith("/walk "));
  expect(JSON.parse(asked?.slice(6) ?? "{}"), "it asks for the steps of the one the reply carries").toMatchObject({
    doing: "trigger.edit",
    values: { trigger: "signs" },
  });
  expect(did(seen, "version.save"), "and only shows").toEqual([]);
});
