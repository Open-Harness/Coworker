import { type Browser, expect, type Page } from "@playwright/test";
import { hasTask, say, signedIn, type Team } from "./team.ts";

/** A workspace that looks lived in: people, three managers, tasks in every lane, runs, questions and environments. */
export interface Acme {
  readonly page: Page;
  readonly id: string;
  readonly launch: Team;
  readonly incidents: Team;
  /** What was added to every address and email, so that a second workspace of the same kind can stand beside this one. */
  readonly tag: string;
}

const TASKS: readonly (readonly [string, string])[] = [
  ["Write the v2.3 changelog", "One page. Say what changed for people who export data, then link the migration notes."],
  ["Check a 150k row export", "Run the export against the Northwind copy and note where it slows down."],
  ["Reply to Northwind about row limits", "They asked whether the limit is for good. Wait for the decision."],
  ["Update the pricing page copy", "Seats and sandbox hours only. Models run on the customer's own keys."],
  ["Publish the migration guide", "Reviewed by support before it goes out."],
  ["Fix the broken link in the API docs", "The streaming page points at the old path."],
  ["Plan the release call", "Agenda, who speaks, and the questions we expect."],
];

async function json<T>(page: Page, method: "POST" | "PUT", path: string, data: unknown): Promise<T> {
  // Better Auth refuses a cookie-carrying POST that does not say which page sent it.
  const response = await page.request.fetch(path, { method, data, headers: { origin: new URL(page.url()).origin } });
  expect(response.ok(), `${method} ${path} answered ${response.status()}: ${await response.text()}`).toBe(true);
  return (await response.json()) as T;
}

async function manager(page: Page, id: string, name: string, template: string): Promise<Team> {
  const made = await json<{ manager: { managerId: string } }>(page, "POST", `/api/workspaces/${id}/managers`, { name, template });
  const managerId = made.manager.managerId;
  return { page, workspaceId: id, managerId, api: `/api/workspaces/${id}/managers/${managerId}` };
}

async function tasks(team: Team, list: readonly (readonly [string, string])[]): Promise<void> {
  for (const [index, [title, description]] of list.entries()) {
    await say(team, `add a task: ${title}`, `add-${index}`);
    await hasTask(team, title);
    await json(team.page, "POST", `${team.api}/actions/task.update`, {
      input: { task: `DT-${index + 1}`, description },
      requestId: `describe-${index}`,
    });
  }
}

const move = (team: Team, task: string, lane: string) =>
  json(team.page, "POST", `${team.api}/actions/task.move`, { input: { task, lane }, requestId: `move-${task}` });

async function waits(team: Team, count: number): Promise<void> {
  await expect
    .poll(async () => {
      const body = (await (await team.page.request.get(`/api/workspaces/${team.workspaceId}/inbox`)).json()) as { items: unknown[] };
      return body.items.length;
    })
    .toBeGreaterThanOrEqual(count);
}

async function people(browser: Browser, page: Page, id: string, tag: string): Promise<void> {
  const mail = (address: string): string => address.replace("@", `${tag}@`);
  for (const [email, role] of [
    [mail("bo.larsen@acme.test"), "builder"],
    [mail("chidi.okafor@acme.test"), "member"],
  ] as const) {
    const invited = await json<{ id: string }>(page, "POST", "/api/auth/organization/invite-member", { email, role, organizationId: id });
    const theirs = await signedIn(browser, email, email.startsWith("bo") ? "Bo Larsen" : "Chidi Okafor");
    await json(theirs, "POST", "/api/auth/organization/accept-invitation", { invitationId: invited.id });
  }
  for (const [email, role] of [
    [mail("dana@acme.test"), "member"],
    [mail("eve@partner.test"), "builder"],
  ] as const)
    await json(page, "POST", "/api/auth/organization/invite-member", { email, role, organizationId: id });
  await json(page, "PUT", `/api/workspaces/${id}/join/links`, { on: true });
  await json(page, "PUT", `/api/workspaces/${id}/join/domains`, { domains: ["acme.test"] });
  await json(page, "POST", `/api/workspaces/${id}/people/handles`, {
    person: `email:${mail("bo.larsen@acme.test")}`,
    kind: "github",
    id: "4821",
    display: "bolarsen",
  });
  await json(page, "POST", `/api/workspaces/${id}/people/handles`, {
    person: "email:pat@northwind.test",
    kind: "email",
    id: "pat@northwind.test",
    display: "Pat at Northwind",
  });
}

async function environments(page: Page, id: string): Promise<void> {
  const path = `/api/workspaces/${id}/environments`;
  const web = await json<{ environment: { id: string } }>(page, "PUT", path, {
    name: "Web app",
    size: "4 vCPU · 8 GB",
    setup:
      "apt-get install -y git\nexport NPM_TOKEN=vault:npm\ngit clone https://github.com/acme/web /work/web\ncd /work/web && pnpm install",
  });
  await json(page, "PUT", path, { name: "Docs", size: "1 vCPU · 2 GB", setup: "pip install mkdocs-material" });
  await json(page, "PUT", `/api/workspaces/${id}/secrets/npm`, { value: "not-a-real-token" });
  await json(page, "PUT", `/api/workspaces/${id}/agents/Worker/environment`, { environment: web.environment.id });
}

/** A lived-in workspace. A `tag` makes a second one that shares nothing with the first, for another spec of the same run. */
export async function acme(browser: Browser, tag = ""): Promise<Acme> {
  const page = await signedIn(browser, `ama.mensah${tag}@acme.test`, "Ama Mensah");
  const made = await json<{ workspace: { workspaceId: string } }>(page, "POST", "/api/workspaces", {
    name: "Acme",
    address: `acme-shots${tag}`,
    region: "eu",
  });
  const id = made.workspace.workspaceId;
  await json(page, "POST", "/api/workspaces", { name: "Ama's own", address: `ama-shots${tag}`, region: "us" });
  await json(page, "POST", `/api/workspaces/${id}/models`, { source: "anthropic", key: "sk-ant-test-works" });
  await people(browser, page, id, tag);
  await environments(page, id);
  const launch = await manager(page, id, "Launch", "kanban");
  const incidents = await manager(page, id, "Incidents", "incident");
  await manager(page, id, "Support desk", "support");
  await say(
    launch,
    "add a page What we promised: ## Exports\n\nNorthwind was told exports have **no row limit**.\n\n- The docs go out with v2.3\n- Support answers within a day",
    "page",
  );
  await tasks(launch, TASKS);
  await move(launch, "DT-5", "review");
  await move(launch, "DT-6", "done");
  await move(launch, "DT-2", "doing");
  await move(launch, "DT-3", "doing");
  await say(launch, "start a writer on DT-1 draft it", "run-1");
  await say(launch, "start a tester on DT-2 blocked on access", "run-2");
  await say(
    launch,
    "ask me to decide on DT-3: Should the v2.3 export docs promise no row limit, or a 150k limit? 150k limit for v2.3 | No limit, hold the date | No limit, move the release a week",
    "decide",
  );
  await tasks(incidents, [
    ["Checkout is slow in eu-west", "p95 went from 300 ms to 4 s at 09:12."],
    ["Webhook deliveries are delayed", "The queue has 12k messages. No data is lost."],
    ["Sign-in emails arrive twice", "Only Outlook addresses so far."],
  ]);
  await move(incidents, "DT-1", "investigating");
  await say(incidents, "ask me: Which day did the checkout change ship?", "day");
  await waits(launch, 2);
  return { page, id, launch, incidents, tag };
}
