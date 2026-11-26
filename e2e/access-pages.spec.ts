import { expect, test, type Page } from "@playwright/test";
import { FAILING } from "./access-failures.ts";
import { breakIt, check, recovers } from "./access-recover.ts";
import { everyone, type Everyone, type Who } from "./access-people.ts";
import { type Ids, NAVIGATION, PAGES, type Row } from "./access-table.ts";
import { shot } from "./shots.ts";

/*
 * Five people walk every page: the sidebar offers each only what they may open, an address they may not open shows a plain
 * page with a way back and never asks the server for the content, and the server refuses the content too. Then every kind
 * of page is opened while its data fails, and says so and recovers.
 */

/** The page that stands in: the workspace's own settings say they are the Owners', every other says the person can't. */
const NO_ACCESS = /^(You can't open this page|Only Owners open this page)$/u;
const WHO: readonly Who[] = ["owner", "builder", "member", "granted", "narrowed"];

const apiOf = (ids: Ids, path: string): string => `/api/workspaces/${ids.workspace}${path}`;

async function sidebarOffers(page: Page, ids: Ids, who: Who): Promise<void> {
  await page.goto(`/ws/${ids.workspace}/inbox`);
  await check(page.getByRole("heading", { level: 1, name: "Inbox" })).toBeVisible();
  await check(page.getByRole("link", { name: "People", exact: true })).toBeVisible();
  for (const { name, role, open } of NAVIGATION) {
    // The Inbox says how many wait: "Inbox 2".
    const item = page.getByRole(role, { name: new RegExp(`^${name}( [0-9]+)?$`, "u") });
    if (open.includes(who)) await check(item.first(), `${who} is offered ${name}`).toBeVisible();
    else await check(item, `${who} is not offered ${name}`).toHaveCount(0);
  }
}

async function opensOrIsTold(page: Page, ids: Ids, who: Who, row: Row): Promise<void> {
  const asked: string[] = [];
  const watch = (request: { url: () => string }) => void asked.push(new URL(request.url()).pathname);
  page.on("request", watch);
  await page.goto(row.address(ids));
  const told = page.getByRole("heading", { level: 1, name: NO_ACCESS });
  if (row.open.includes(who)) {
    await check(page.getByRole("heading", { name: row.heading, exact: true }).first(), `${who} opens ${row.name}`).toBeVisible();
    await check(told).toHaveCount(0);
  } else {
    await check(told, `${who} is told they can't open ${row.name}`).toBeVisible();
    await check(page.getByText(/ask an Owner/iu).first()).toBeVisible();
    await check(page.getByRole("link", { name: "Back to the Inbox" })).toBeVisible();
    await check(page.getByRole("heading", { name: row.heading, exact: true })).toHaveCount(0);
    await check(page.getByText(/did not load|went wrong|error/iu)).toHaveCount(0);
    for (const path of row.data(ids)) expect(asked, `${who} never asked for ${row.name}'s ${path}`).not.toContain(apiOf(ids, path));
  }
  page.off("request", watch);
}

async function serverRefuses(page: Page, ids: Ids, who: Who, row: Row): Promise<void> {
  for (const path of row.data(ids)) {
    const answer = await page.request.get(apiOf(ids, path));
    const status = answer.status();
    expect(status, `${who} asking for ${row.name}'s ${path}: ${await answer.text()}`).toBe(row.open.includes(who) ? 200 : 403);
  }
}

async function walk(pages: Everyone["pages"], ids: Ids): Promise<void> {
  for (const who of WHO) {
    const page = pages[who];
    await sidebarOffers(page, ids, who);
    for (const row of PAGES) {
      await opensOrIsTold(page, ids, who, row);
      await serverRefuses(page, ids, who, row);
    }
  }
}

async function wayBack(page: Page, ids: Ids): Promise<void> {
  await page.goto(`/ws/${ids.workspace}/settings/billing`);
  await check(page.getByRole("heading", { level: 1, name: NO_ACCESS })).toBeVisible();
  await page.getByRole("link", { name: "Back to the Inbox" }).click();
  await check(page.getByRole("heading", { level: 1, name: "Inbox" })).toBeVisible();
}

test("ui:access/pages", async ({ browser }) => {
  test.setTimeout(900_000);
  const { app, pages } = await everyone(browser, "-acc");
  const ids: Ids = { workspace: app.id, manager: app.launch.managerId };

  await walk(pages, ids);

  await pages.member.goto(`/ws/${ids.workspace}/settings/members`);
  await check(pages.member.getByRole("heading", { level: 1, name: NO_ACCESS })).toBeVisible();
  await shot(pages.member, "access-no-page", "both");
  await wayBack(pages.member, ids);
  await pages.narrowed.goto(`/ws/${ids.workspace}/m/${ids.manager}/mission`);
  await check(pages.narrowed.getByRole("heading", { level: 1, name: NO_ACCESS })).toBeVisible();
  await shot(pages.narrowed, "access-no-page-narrowed", "both");

  // An Owner takes the Member's reading of the board away: the sidebar follows without a reload.
  const { page: owner } = app;
  await owner.request.put(apiOf(ids, "/permissions"), {
    data: { person: "email:chidi.okafor-acc@acme.test", scope: "action", key: "board.read", value: "off" },
    headers: { origin: new URL(owner.url()).origin },
  });
  await check(pages.member.getByRole("link", { name: "Board", exact: true })).toHaveCount(0, { timeout: 20_000 });
  await check(pages.member.getByRole("link", { name: "Chat", exact: true })).toHaveCount(0);
  await check(pages.member.getByRole("link", { name: /^Inbox/u })).toBeVisible();
  // Every page of the manager closes with the board, at its address and on the server, and search tells nothing of them.
  for (const row of PAGES.filter(({ address }) => address(ids).includes(`/m/${ids.manager}`))) {
    const shut: Row = { ...row, open: [] };
    await opensOrIsTold(pages.member, ids, "member", shut);
    await serverRefuses(pages.member, ids, "member", shut);
  }
  const hits = async (page: Page): Promise<readonly { readonly kind: string }[]> =>
    (await (await page.request.get(apiOf(ids, "/search?q=changelog"))).json()).hits;
  expect((await hits(owner)).some(({ kind }) => kind === "task")).toBe(true);
  expect((await hits(pages.member)).filter(({ kind }) => kind === "task" || kind === "page")).toEqual([]);

  for (const row of FAILING) {
    const { heal } = await breakIt(owner, row, ids);
    await owner.goto(row.address(ids));
    await recovers(owner, row, heal, async () => {
      if (row.name === "Board") await shot(owner, "access-load-failed", "both");
    });
  }
});
