import { type Browser, expect, type Page, test } from "@playwright/test";
import { shot } from "./shots.ts";
import { signedIn, team, workspace } from "./team.ts";

/*
 * A person writes to a manager in the browser and reads the answer as it is made. The chat is the same after a reload.
 * With no model connected, the page says what to do: a link for the person who can connect one, other words for anyone else.
 */

const LONG_ASK = "write at length about exports";
const LONG_END = "That is the whole of it.";

async function post<T>(page: Page, path: string, data: unknown): Promise<T> {
  const response = await page.request.fetch(path, { method: "POST", data, headers: { origin: new URL(page.url()).origin } });
  expect(response.ok(), `${path} answered ${response.status()}: ${await response.text()}`).toBe(true);
  return (await response.json()) as T;
}

/** A person in the chat: types what they say and sends it, as one does. */
async function writes(page: Page, words: string): Promise<void> {
  const box = page.getByRole("textbox", { name: "Message input" });
  await box.fill(words);
  await box.press("Enter");
}

/** How many numbered points of the long answer are on the page, and whether its last words are. */
async function longAnswerSoFar(page: Page): Promise<{ points: number; finished: boolean }> {
  const text = await page.getByRole("main").innerText();
  return { points: (text.match(/Point \d+:/gu) ?? []).length, finished: text.includes(LONG_END) };
}

/** A workspace with a manager and no model connected, its Owner and a Member who joined. */
async function noModel(browser: Browser): Promise<{ owner: Page; member: Page; chat: string }> {
  const owner = await signedIn(browser, "nomodel.owner@example.test", "Ama Mensah");
  const id = await workspace(owner, "nomodelteam");
  const made = await post<{ manager: { managerId: string } }>(owner, `/api/workspaces/${id}/managers`, {
    name: "Launch",
    template: "kanban",
  });
  const email = "nomodel.member@example.test";
  const invited = await post<{ id: string }>(owner, "/api/auth/organization/invite-member", { email, role: "member", organizationId: id });
  const member = await signedIn(browser, email, "Chidi Okafor");
  await post(member, "/api/auth/organization/accept-invitation", { invitationId: invited.id });
  return { owner, member, chat: `/ws/${id}/m/${made.manager.managerId}/chat` };
}

/** With no model connected, the page says what to do about it, in words for whoever is reading. */
async function readsWhatToDo(browser: Browser): Promise<void> {
  const { owner, member, chat } = await noModel(browser);

  // Whoever can connect a model is told what to do and given the way to do it.
  await owner.goto(chat);
  await expect(owner.getByText("No model is connected", { exact: true })).toBeVisible();
  await expect(owner.getByText(/Add a provider key, your own endpoint or ChatGPT/u)).toBeVisible();
  await shot(owner, "chat-no-model", "both");
  await owner.getByRole("link", { name: "Add a model" }).click();
  await expect(owner.getByRole("heading", { level: 1, name: "Keys and connections" })).toBeVisible();

  // Anyone else is told who to ask, and is given no link that would refuse them.
  await member.goto(chat);
  await expect(member.getByText("No model is connected yet", { exact: true })).toBeVisible();
  await expect(member.getByText(/Ask an Owner of this workspace/u)).toBeVisible();
  await expect(member.getByRole("link", { name: "Add a model" })).toHaveCount(0);
  await shot(member, "chat-no-model-member", "both");
}

test("ui:chat/talk", async ({ browser }) => {
  const launch = await team(await signedIn(browser, "talk@example.test", "Ama Mensah"), "talkteam");
  const { page } = launch;
  await page.goto(`/ws/${launch.workspaceId}/m/${launch.managerId}/chat`);
  await expect(page.getByRole("heading", { level: 1, name: "Chat" })).toBeVisible();
  await expect(page.getByText("Say hello to Launch")).toBeVisible();

  // A person writes; the manager answers and does what was asked.
  await writes(page, "add a task: Check the export limits");
  await expect(page.getByText("add a task: Check the export limits")).toBeVisible();
  await expect(page.getByText("On it.")).toBeVisible();
  await expect(page.getByText(/^Done\./u)).toBeVisible();
  await shot(page, "chat-talk", "both");

  // A long answer is on the page before it is whole, and grows until it is.
  await writes(page, LONG_ASK);
  await expect(page.getByText(LONG_ASK)).toBeVisible();
  await expect
    .poll(async () => (await longAnswerSoFar(page)).points, { intervals: [100], message: "a part of the answer shows" })
    .toBeGreaterThan(0);
  const early = await longAnswerSoFar(page);
  expect(early.finished, "the answer was already whole when its first words showed").toBe(false);
  await expect(page.getByText("Writing…")).toBeVisible();
  await shot(page, "chat-talk-writing", "both");
  await expect
    .poll(
      async () => {
        const now = await longAnswerSoFar(page);
        return now.points > early.points && !now.finished;
      },
      { intervals: [100], message: "the part shown grows while it is still not whole" },
    )
    .toBe(true);
  await expect(page.getByText(LONG_END)).toBeVisible();
  await expect(page.getByText("Writing…")).toBeHidden();
  const whole = await longAnswerSoFar(page);
  expect(whole.points).toBe(700);

  // After a reload the chat is the same: the same people's words, the same answers, in the same order.
  const said = async () => (await page.getByRole("main").innerText()).replace(/\s+/gu, " ");
  const before = await said();
  await page.reload();
  await expect(page.getByText(LONG_END)).toBeVisible();
  expect(await said()).toBe(before);
  await expect(page.getByText("add a task: Check the export limits")).toBeVisible();

  await readsWhatToDo(browser);
});
