import type { Page, Route } from "@playwright/test";
import { AT, HEADERS, OTHERS, READS, WRITES } from "./fixtures/index.ts";
import type { How, Screen } from "./screens.ts";

/*
 * A page of the app whose every request is answered from `fixtures/`, at 09:54 on 25 November 2026 in the workspace's
 * time zone; and the drawing beside it. `SCREENS_AGAINST=design` puts the drawing in the app's place, which must be green.
 */
export const APP = `http://localhost:${process.env["SCREENS_PORT"] ?? 8810}`;
export const DRAWN = `http://localhost:${process.env["DESIGN_PORT"] ?? 5311}`;
const itself = process.env["SCREENS_AGAINST"] === "design";
export const LIVE = "**/api/ws/*/live";

const json = (route: Route, body: unknown, status = 200): Promise<void> =>
  route.fulfill({ status, headers: HEADERS, body: JSON.stringify(body) });

async function answer(route: Route, how: How | undefined, asked: string[], out: boolean): Promise<void> {
  const request = route.request();
  const { pathname, search } = new URL(request.url());
  const path = pathname.replace(/^\/api\/ws\/(?:acme|ws-acme)/u, "");
  asked.push(`${request.method()} ${pathname}${search}`);
  if (how === "slow") return;
  if (how === "fails") return json(route, { error: "It did not answer" }, 500);
  if (how === "gone") return json(route, { error: "Not found" }, 404);
  if (out) return pathname in OTHERS && pathname !== "/api/me" ? json(route, OTHERS[pathname]) : json(route, { error: "Not signed in" }, 401);
  if (pathname in OTHERS) return json(route, OTHERS[pathname]);
  const known = request.method() === "GET" ? (READS[`${path}${search}`] ?? READS[path]) : WRITES[path];
  return known === undefined ? json(route, { error: `No fixture for ${request.method()} ${path}${search}` }, 404) : json(route, known);
}

/** Opens the app's page for a screen. What it asked for is in the answer, so that a red eval says what had no fixture. */
export async function open(page: Page, screen: Screen): Promise<readonly string[]> {
  const asked: string[] = [];
  await page.clock.install({ time: AT });
  if (itself) {
    await draw(page, screen.id);
    return asked;
  }
  await page.routeWebSocket(LIVE, () => undefined);
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api\/ws\/(?:acme|ws-acme)/u, "");
    const how = screen.reads?.[path];
    return how === "offline" ? answer(route, undefined, asked, false) : answer(route, how, asked, screen.out === true);
  });
  await page.goto(screen.page.startsWith("//") ? `${APP}${screen.page.slice(1)}` : `${APP}/ws/acme${screen.page}`);
  if (screen.then === "mod+k") {
    await page.locator("main").first().waitFor();
    await page.keyboard.press("ControlOrMeta+k");
  }
  if (Object.values(screen.reads ?? {}).includes("offline")) {
    await settled(page);
    // Only this page loses its connection: the drawing beside it, in the same context, must still load.
    await (await page.context().newCDPSession(page)).send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await page.evaluate(() => dispatchEvent(new Event("offline")));
  }
  await settled(page, Object.values(screen.reads ?? {}).includes("slow"));
  return asked;
}

export async function draw(page: Page, id: string): Promise<void> {
  await page.goto(`${DRAWN}/?mode=${page.context().browser() === null ? "light" : await page.evaluate(() => (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"))}#${id}`);
  await settled(page);
}

/** Nothing on it has changed for a while, and no motion is left. */
export async function settled(page: Page, held = false): Promise<void> {
  // A read held on purpose never ends, so the network is never idle: do not wait for it, only for the page to be drawn.
  await page.waitForLoadState("networkidle", held ? { timeout: 1000 } : undefined).catch(() => undefined);
  await page.waitForFunction(() => (document.querySelector("#astryx-app-shell-main") ?? document.body).textContent!.trim().length > 20, undefined, { timeout: 8000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts.ready);
  let [last, same] = ["", 0];
  for (let n = 0; n < 40 && same < 3; n++) {
    await page.clock.runFor(250);
    await page.waitForTimeout(100);
    const now = await page.evaluate(() => document.body.innerHTML);
    same = now === last && now.includes("<") ? same + 1 : 0;
    last = now;
  }
}

/** What the screen itself is, without the shell around it. */
export async function main(page: Page, screen: Pick<Screen, "then">) {
  if (screen.then === "mod+k") return page.getByRole("dialog");
  const inside = page.locator("#astryx-app-shell-main");
  return (await inside.count()) > 0 ? inside : page.locator("body");
}

/** How long until a page that was never open has its own words on it. */
export async function ready(page: Page, screen: Screen): Promise<number> {
  await page.goto("about:blank");
  const from = Date.now();
  await page.goto(itself ? `${DRAWN}/?mode=light#${screen.id}` : `${APP}/ws/acme${screen.page}`, { waitUntil: "commit" });
  await page.waitForFunction(() => (document.querySelector("#astryx-app-shell-main main, #astryx-app-shell-main h1")?.textContent ?? "").trim().length > 2, undefined, { timeout: 8000 }).catch(() => undefined);
  return Date.now() - from;
}
