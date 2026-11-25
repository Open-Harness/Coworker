import type { ReactNode } from "react";
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { BrowserProvider, createServer, ServerProvider } from "~/modules/team-core/service.ts";
import { Home, Overview } from "./service.ts";

afterEach(cleanup);

/** The screen in a router, with a server that answers from memory: a route nobody listed is a 404. */
function show(ui: ReactNode, routes: Readonly<Record<string, unknown>>) {
  const asked: string[] = [];
  const send = async (path: string): Promise<Response> => {
    asked.push(path);
    const answer = routes[path];
    return answer === undefined ? Response.json({ error: `Nothing at ${path}` }, { status: 404 }) : Response.json(answer);
  };
  const router = createRouter({
    routeTree: createRootRoute({ component: () => ui }),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(
    <LayerProvider>
      <BrowserProvider browser={{ here: () => "/", goTo: () => undefined, newId: () => "id" }}>
        <ServerProvider server={createServer(send)}>
          <RouterProvider router={router} />
        </ServerProvider>
      </BrowserProvider>
    </LayerProvider>,
  );
  return asked;
}

/** Thirty days ending 2026-11-24. */
const DAYS = Array.from({ length: 30 }, (_, index) => new Date(Date.UTC(2026, 10, 24 - (29 - index))).toISOString().slice(0, 10));
const series = (last: readonly number[]): number[] => [...Array.from({ length: 30 - last.length }, () => 0), ...last];
const none = series([]);

const HOME = {
  days: DAYS,
  canSeeTasks: true,
  tiles: { openTasks: 5, runningAgents: 2, waitingOnPeople: 1, needsYou: 2 },
  created: series([0, 0, 0, 0, 0, 2, 1]),
  finished: series([0, 0, 0, 0, 0, 0, 1]),
  events: { accepted: series([0, 0, 0, 0, 0, 1, 1]), followup: none, ignored: series([0, 0, 0, 0, 0, 0, 2]), waiting: none },
  managers: [
    { managerId: "m1", name: "Launch", openTasks: 3, runningAgents: 2, waitingOnPeople: 1 },
    { managerId: "m2", name: "Support", openTasks: 2, runningAgents: 0, waitingOnPeople: 0 },
  ],
  needsYou: {
    total: 2,
    items: [
      { id: "question:2", title: "Ship it on Friday?", managerName: "Launch", kind: "question", createdAt: 1_700_000_100_000 },
      { id: "approval:1", title: "Allow a sandbox command", managerName: "Support", kind: "approval", createdAt: 1_700_000_000_000 },
    ],
  },
};
const EMPTY_HOME = {
  ...HOME,
  tiles: { openTasks: 0, runningAgents: 0, waitingOnPeople: 0, needsYou: 0 },
  created: none,
  finished: none,
  events: { accepted: none, followup: none, ignored: none, waiting: none },
  managers: [],
  needsYou: { total: 0, items: [] },
};

const SLOW = { timeout: 5_000 };
const sum = (cells: readonly HTMLElement[]): number => cells.reduce((total, cell) => total + Number(cell.textContent), 0);

describe("Home", () => {
  it("shows the numbers, and with them what needs you newest first, each opening its item", async () => {
    show(<Home workspaceId="w1" />, { "/api/workspaces/w1/home": HOME });
    expect(await screen.findByRole("heading", { level: 1, name: "Home" })).toBeTruthy();
    for (const [label, value] of [
      ["Open tasks", "5"],
      ["Agents running", "2"],
      ["Waiting on people", "1"],
      ["Needs you", "2"],
    ] as const) {
      const labels = await screen.findAllByText(label);
      expect(
        labels.some(
          (one) => one.parentElement?.textContent === `${label}${value}${one.parentElement?.lastElementChild?.textContent ?? ""}`,
        ),
      ).toBe(true);
    }
    const needs = within(screen.getByRole("list", { name: "Needs you" })).getAllByRole("link");
    expect(needs.map((link) => link.getAttribute("href"))).toEqual(["/ws/w1/inbox/question%3A2", "/ws/w1/inbox/approval%3A1"]);
    expect(needs[0]?.textContent).toContain("Ship it on Friday?");
    const managers = within(screen.getByRole("list", { name: "Managers" })).getAllByRole("link");
    expect(managers.map((link) => link.getAttribute("href"))).toEqual(["/ws/w1/m/m1/overview", "/ws/w1/m/m2/overview"]);
    expect(managers[0]?.closest("li")?.textContent).toContain("Needs you");
    expect(managers[1]?.closest("li")?.textContent).toContain("Idle");
  });

  it("gives every chart its numbers as a table, and switches between 7 and 30 days", async () => {
    show(<Home workspaceId="w1" />, { "/api/workspaces/w1/home": HOME });
    const created = await screen.findByRole("table", { name: "Tasks created and finished per day, the last 7 days, as numbers" }, SLOW);
    expect(within(created).getAllByRole("row")).toHaveLength(8);
    expect(within(created).getByText("24 Nov")).toBeTruthy();
    expect(screen.getByRole("table", { name: "Events per day by what became of them, the last 7 days, as numbers" })).toBeTruthy();
    expect(
      sum(
        within(created)
          .getAllByRole("cell")
          .filter((_, index) => index % 3 === 1),
      ),
    ).toBe(3);
    await userEvent.click(screen.getByRole("radio", { name: "30 days" }));
    const month = await screen.findByRole("table", { name: "Tasks created and finished per day, the last 30 days, as numbers" }, SLOW);
    expect(within(month).getAllByRole("row")).toHaveLength(31);
    expect(screen.getAllByRole("img", { name: "Tasks created and finished per day, the last 30 days" })).toHaveLength(1);
  });

  it("is quiet in a new workspace: no chart of nothing, and where to begin", async () => {
    show(<Home workspaceId="w1" />, { "/api/workspaces/w1/home": EMPTY_HOME });
    expect(await screen.findByText("No managers yet", { selector: "h2" })).toBeTruthy();
    expect(screen.getByText("Nothing waits for you")).toBeTruthy();
    expect(screen.getByText("No tasks yet")).toBeTruthy();
    expect(screen.getByText("Nothing has arrived")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("leaves task numbers out for a role that may not read tasks", async () => {
    show(<Home workspaceId="w1" />, { "/api/workspaces/w1/home": { ...EMPTY_HOME, canSeeTasks: false, needsYou: HOME.needsYou } });
    expect(await screen.findByText("Tasks are not open to your role")).toBeTruthy();
    expect(screen.queryByText("Open tasks")).toBeNull();
    expect(screen.getByText("Ship it on Friday?")).toBeTruthy();
  });

  it("says why it did not load and asks again on request", async () => {
    show(<Home workspaceId="w1" />, {});
    expect((await screen.findAllByText("Home did not load")).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Try again" }).length).toBeGreaterThan(0);
  });
});

const OVERVIEW = {
  days: DAYS,
  managerId: "m1",
  name: "Launch",
  mission: "Ship the release without surprises.",
  lanes: [
    { id: "todo", name: "To do", count: 2, isDone: false },
    { id: "doing", name: "Doing", count: 1, isDone: false },
    { id: "done", name: "Done", count: 1, isDone: true },
  ],
  totals: { tasks: 4, open: 3, done: 1, runningAgents: 1, waitingOnPeople: 1 },
  created: series([0, 0, 0, 1, 2, 1]),
  finished: series([0, 0, 0, 0, 1]),
  open: series([0, 0, 1, 2, 3, 3, 3]).map((count) => count),
  blocked: [{ id: "DT-2", title: "Check the export", lane: "doing", reason: "Needs your answer", stage: "person.answer" }],
  agents: [{ agent: "writer", tasks: 2, done: 1, running: 1 }],
};

describe("Overview", () => {
  const path = "/api/workspaces/w1/managers/m1/overview";

  it("names the manager and its mission, and opens the task that needs a person", async () => {
    show(<Overview workspaceId="w1" managerId="m1" />, { [path]: OVERVIEW });
    expect(await screen.findByRole("heading", { level: 1, name: "Launch" })).toBeTruthy();
    expect(screen.getByText("Ship the release without surprises.")).toBeTruthy();
    const blocked = within(await screen.findByRole("list", { name: "Blocked and waiting" })).getByRole("link");
    expect(blocked.getAttribute("href")).toBe("/ws/w1/m/m1/tasks/DT-2");
    expect(blocked.textContent).toContain("Needs your answer");
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/ws/w1");
  });

  it("gives tasks by lane, the burndown and created against finished, each with its numbers", async () => {
    show(<Overview workspaceId="w1" managerId="m1" />, { [path]: OVERVIEW });
    const lanes = await screen.findByRole("table", { name: "Tasks by lane, as numbers" }, SLOW);
    expect(
      within(lanes)
        .getAllByRole("row")
        .map((row) => row.textContent),
    ).toEqual(["PartCount", "To do2", "Doing1", "Done1"]);
    expect(screen.getByRole("table", { name: "Open tasks at the end of each day, the last 7 days, as numbers" })).toBeTruthy();
    expect(screen.getByRole("table", { name: "Tasks created and finished per day, the last 7 days, as numbers" })).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: "30 days" }));
    await waitFor(() =>
      expect(screen.getByRole("table", { name: "Open tasks at the end of each day, the last 30 days, as numbers" })).toBeTruthy(),
    );
  });

  it("tables each agent's progress", async () => {
    show(<Overview workspaceId="w1" managerId="m1" />, { [path]: OVERVIEW });
    const row = within(await screen.findByRole("table", { name: "Agents" })).getByRole("row", { name: /writer/u });
    expect(row.textContent).toContain("1 of 2 done");
  });

  it("has no dated timeline, since tasks have no due dates", async () => {
    show(<Overview workspaceId="w1" managerId="m1" />, { [path]: OVERVIEW });
    await screen.findByRole("heading", { level: 1, name: "Launch" });
    expect(screen.queryByText(/milestone|timeline|due/iu)).toBeNull();
  });

  it("points a manager with no tasks to its chat", async () => {
    show(<Overview workspaceId="w1" managerId="m1" />, {
      [path]: {
        ...OVERVIEW,
        lanes: OVERVIEW.lanes.map((lane) => ({ ...lane, count: 0 })),
        totals: { ...OVERVIEW.totals, tasks: 0 },
        agents: [],
        blocked: [],
      },
    });
    expect(await screen.findByText("Nothing to show yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open the chat" }).getAttribute("href")).toBe("/ws/w1/m/m1/chat");
    expect(screen.queryByRole("img")).toBeNull();
  });
});
