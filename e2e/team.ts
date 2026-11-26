import { type Browser, expect, type Page } from "@playwright/test";

/** The fake world's Anthropic key: its fake provider takes it and nothing else (src/modules/models/testing.ts). */
const FAKE_ANTHROPIC_KEY = "sk-ant-test-works";

/** The last mail the fake world sent to an address. */
export async function lastMail(page: Page, email: string): Promise<string> {
  const { text } = (await (await page.request.get(`/api/test/mail?to=${encodeURIComponent(email)}`)).json()) as { text: string | null };
  expect(text, `No mail to ${email}`).not.toBeNull();
  return text ?? "";
}

export function linkIn(mail: string): string {
  const link = /https?:\/\/\S+/u.exec(mail)?.[0];
  expect(link).toBeDefined();
  return link ?? "";
}

/** Someone signed in with the email link the fake world mailed them, in a browser of their own. */
export async function signedIn(browser: Browser, email: string, name = "Ama"): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  const asked = await page.request.post("/api/auth/sign-in/magic-link", { data: { email, name, callbackURL: "/api/health" } });
  expect(asked.ok()).toBe(true);
  await page.goto(linkIn(await lastMail(page, email)));
  return page;
}

async function post<T>(page: Page, path: string, data: unknown): Promise<T> {
  const response = await page.request.post(path, { data });
  expect(response.ok(), `${path} answered ${response.status()}`).toBe(true);
  return (await response.json()) as T;
}

/** A new workspace, by its id. */
export async function workspace(page: Page, address: string, name = address): Promise<string> {
  const created = await post<{ workspace: { workspaceId: string } }>(page, "/api/workspaces", { name, address, region: "eu" });
  return created.workspace.workspaceId;
}

/** A workspace with a model key and one manager on the given template. */
export interface Team {
  readonly page: Page;
  readonly workspaceId: string;
  readonly managerId: string;
  /** The manager's API base. */
  readonly api: string;
}

export async function team(page: Page, address: string, template = "kanban"): Promise<Team> {
  const workspaceId = await workspace(page, address);
  await post(page, `/api/workspaces/${workspaceId}/models`, { source: "anthropic", key: FAKE_ANTHROPIC_KEY });
  const made = await post<{ manager: { managerId: string } }>(page, `/api/workspaces/${workspaceId}/managers`, {
    name: "Launch",
    template,
  });
  const managerId = made.manager.managerId;
  return { page, workspaceId, managerId, api: `/api/workspaces/${workspaceId}/managers/${managerId}` };
}

/** Tells the manager something in its chat, as a person would. */
export const say = (launch: Team, text: string, requestId: string): Promise<unknown> =>
  post(launch.page, `${launch.api}/chat`, { text, requestId });

/** Waits until the manager's board holds a task with this title. */
export async function hasTask(launch: Team, title: string): Promise<void> {
  await expect
    .poll(async () => {
      const body = (await (await launch.page.request.get(launch.api)).json()) as { board?: { tasks?: { title: string }[] } };
      return body.board?.tasks?.some((task) => task.title === title) ?? false;
    })
    .toBe(true);
}

export const boardPath = (launch: Team): string => `/ws/${launch.workspaceId}/m/${launch.managerId}`;
