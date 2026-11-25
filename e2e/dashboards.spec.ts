import { expect, test, type Page } from "@playwright/test";
import { allowDomain, inboundMail, managerAddress } from "./inbound.ts";
import { shot } from "./shots.ts";
import { hasTask, say, signedIn, team, workspace, type Team } from "./team.ts";

/* Home and a manager's Overview count real work: tasks made through the chat, a question that waits for a person, an
   agent that is still going, a task finished, and mail that arrived. Nothing is invented for the screens. */

const QUESTION = "Should the v2.3 export docs promise no row limit, or a 150k limit?";
const TODAY = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

interface HomeBody {
  tiles: { openTasks: number; runningAgents: number; waitingOnPeople: number; needsYou: number };
  events: Record<"accepted" | "followup" | "ignored" | "waiting", number[]>;
}
const sum = (series: readonly number[]): number => series.reduce((total, one) => total + one, 0);

async function homeOf(launch: Team): Promise<HomeBody> {
  return (await (await launch.page.request.get(`/api/workspaces/${launch.workspaceId}/home`)).json()) as HomeBody;
}

/** The number a tile shows under its label. */
const tile = (page: Page, label: string) => page.getByText(label, { exact: true }).locator("..");

async function dark(page: Page, name: string): Promise<void> {
  await page.emulateMedia({ colorScheme: "dark" });
  await shot(page, `${name}-dark`);
  await page.emulateMedia({ colorScheme: "light" });
}

test("Home and the manager's Overview count the real work and open what they list", async ({ browser }) => {
  test.setTimeout(180_000);
  const email = "dash.reader@example.test";
  const launch = await team(await signedIn(browser, email, "Dara Reader"), "dashteam");
  const { page, workspaceId, managerId } = launch;

  // Three tasks: one with a question for a person, one an agent keeps working on, one finished.
  for (const [index, title] of ["Document streaming CSV export", "Check a 150k row export", "Reply to Northwind"].entries()) {
    await say(launch, `add a task: ${title}`, `add-${index}`);
    await hasTask(launch, title);
  }
  await say(launch, "start a tester on DT-2 keeps going", "run-2");
  const moved = await page.request.post(`${launch.api}/actions/task.move`, {
    data: { input: { task: "DT-3", lane: "done" }, requestId: "move-3" },
    headers: { origin: new URL(page.url()).origin },
  });
  expect(moved.ok()).toBe(true);

  // Mail from a person on the list becomes a task; mail from a stranger is set aside.
  await allowDomain(launch, "example.test");
  const address = await managerAddress(launch);
  await inboundMail(page, { from: email, to: address, subject: "Export the usage report", text: "Please make it a CSV." });
  await inboundMail(page, { from: "rival@elsewhere.test", to: address, subject: "Buy our newsletter list", text: "Great prices." });
  await expect
    .poll(async () => {
      const { tiles, events } = await homeOf(launch);
      return [tiles.runningAgents, sum(events.accepted) > 0, sum(events.ignored) > 0];
    })
    .toEqual([1, true, true]);
  // The question goes last: a manager waiting for its answer is busy until it comes.
  await say(launch, `ask me to decide on DT-1: ${QUESTION} 150k limit | No limit, hold the date`, "decide-1");
  await expect.poll(async () => (await homeOf(launch)).tiles.needsYou).toBe(1);
  const counted = await homeOf(launch);
  expect(counted.tiles.openTasks).toBe(3);

  // Home: the sidebar entry, the tiles, the charts' numbers and the rail.
  await page.goto(`/ws/${workspaceId}`);
  await expect(page.getByRole("heading", { level: 1, name: "Home", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Home", exact: true })).toBeVisible();
  await expect(tile(page, "Open tasks")).toHaveText(/^Open tasks\s*3/u);
  await expect(tile(page, "Agents running")).toHaveText(/^Agents running\s*1/u);
  await expect(tile(page, "Waiting on people")).toHaveText(new RegExp(`^Waiting on people\\s*${counted.tiles.waitingOnPeople}`, "u"));
  const made = page.getByRole("table", { name: /^Tasks created and finished per day, the last 7 days/u });
  await expect(made.getByRole("row", { name: new RegExp(`^${TODAY}`, "u") }).getByRole("cell")).toHaveText([TODAY, "4", "1"]);
  const arrived = page.getByRole("table", { name: /^Events per day by what became of them, the last 7 days/u });
  await expect(
    arrived
      .getByRole("row", { name: new RegExp(`^${TODAY}`, "u") })
      .getByRole("cell")
      .nth(1),
  ).toHaveText("1");
  const rail = page.getByRole("complementary", { name: "Needs you and managers" });
  const needs = rail.getByRole("list", { name: "Needs you" }).getByRole("link", { name: new RegExp(QUESTION.slice(0, 20), "u") });
  await expect(needs).toBeVisible();
  const state = rail.getByRole("list", { name: "Managers" }).getByRole("link", { name: /Launch/u });
  await expect(state).toHaveAttribute("href", `/ws/${workspaceId}/m/${managerId}/overview`);
  await shot(page, "dashboards-home", "both");
  await dark(page, "dashboards-home");

  // The window switches to thirty days.
  await page.getByRole("radio", { name: "30 days" }).click();
  await expect(page.getByRole("table", { name: /^Tasks created and finished per day, the last 30 days/u }).getByRole("row")).toHaveCount(
    31,
  );
  await shot(page, "dashboards-home-30");
  await page.getByRole("radio", { name: "7 days" }).click();

  // An item in the rail opens that item.
  await needs.click();
  await expect(page.getByRole("heading", { level: 1, name: QUESTION })).toBeVisible();

  // The manager's Overview, from Home's rail and from its own sidebar group.
  await page.goto(`/ws/${workspaceId}`);
  await state.click();
  await expect(page).toHaveURL(new RegExp(`/m/${managerId}/overview$`, "u"));
  await expect(page.getByRole("heading", { level: 1, name: "Launch", exact: true })).toBeVisible();
  const { mission } = (await (await page.request.get(`${launch.api}/overview`)).json()) as { mission: string };
  expect(mission).not.toBe("");
  await expect(page.getByText(mission, { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Overview", exact: true })).toBeVisible();
  const lanes = page.getByRole("table", { name: "Tasks by lane, as numbers" });
  await expect(lanes.getByRole("row", { name: /^Done/u }).getByRole("cell").nth(1)).toHaveText("1");
  await expect(page.getByRole("table", { name: /^Open tasks at the end of each day, the last 7 days/u })).toBeAttached();
  const blocked = page.getByRole("list", { name: "Blocked and waiting" });
  await expect(blocked.getByRole("link", { name: /Document streaming CSV export/u })).toContainText("DT-1");
  await expect(page.getByRole("table", { name: "Agents" }).getByRole("row", { name: /tester|agent/iu })).toBeVisible();
  await shot(page, "dashboards-overview", "both");
  await dark(page, "dashboards-overview");

  // A task that waits for a person opens its page.
  await blocked.getByRole("link", { name: /Document streaming CSV export/u }).click();
  await expect(page).toHaveURL(/\/tasks\/DT-1$/u);
  await expect(page.getByRole("heading", { level: 1, name: "Document streaming CSV export" })).toBeVisible();

  // Someone who is not in the workspace is told it does not exist.
  const outsider = await signedIn(browser, "dash.outsider@example.test", "Out Sider");
  expect((await outsider.request.get(`/api/workspaces/${workspaceId}/home`)).status()).toBe(404);
  expect((await outsider.request.get(`${launch.api}/overview`)).status()).toBe(404);
});

test("Home of a new workspace says what to do, and a manager with no tasks says where to start", async ({ browser }) => {
  const page = await signedIn(browser, "dash.new@example.test", "Nia New");
  const empty = await workspace(page, "dashempty");
  await page.goto(`/ws/${empty}`);
  await expect(page.getByRole("heading", { level: 1, name: "Home", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "No managers yet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nothing waits for you" })).toBeVisible();
  await expect(page.getByRole("img", { name: /per day/u })).toHaveCount(0);
  await shot(page, "dashboards-home-empty", "both");
  await dark(page, "dashboards-home-empty");

  const quiet = await team(page, "dashquiet");
  await page.goto(`/ws/${quiet.workspaceId}/m/${quiet.managerId}/overview`);
  await expect(page.getByRole("heading", { name: "Nothing to show yet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the chat" })).toHaveAttribute(
    "href",
    `/ws/${quiet.workspaceId}/m/${quiet.managerId}/chat`,
  );
  await shot(page, "dashboards-overview-empty", "both");
});
