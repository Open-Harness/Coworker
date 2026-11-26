import { describe, expect, it } from "vitest";
import type { ProgressView } from "~/modules/manager/types.ts";
import type { InboxItem } from "~/modules/workspace/types.ts";
import { dashboards, DAYS } from "./service.ts";
import type { ManagerFacts } from "./types.ts";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-24T15:00:00Z");
const ago = (days: number): number => NOW - days * DAY;

const progress: ProgressView = {
  lanes: [
    { id: "todo", name: "To do" },
    { id: "doing", name: "Doing" },
    { id: "done", name: "Done" },
  ],
  tasks: [
    {
      id: "DT-1",
      title: "Write the changelog",
      lane: "done",
      stage: "idle",
      stageLabel: "",
      createdAt: ago(5),
      finishedAt: ago(2),
      runs: ["run-1"],
    },
    {
      id: "DT-2",
      title: "Check the export",
      lane: "doing",
      stage: "person.answer",
      stageLabel: "Needs your answer",
      createdAt: ago(1),
      runs: ["run-2"],
    },
    { id: "DT-3", title: "Reply to Northwind", lane: "todo", stage: "queued", stageLabel: "Queued", createdAt: ago(0), runs: [] },
    { id: "DT-4", title: "Long ago", lane: "todo", stage: "queued", stageLabel: "Queued", createdAt: ago(60), runs: [] },
  ],
  runs: [
    { id: "run-1", task: "DT-1", agent: "writer", state: "ended", startedAt: ago(4) },
    { id: "run-2", task: "DT-2", agent: "writer", state: "running", startedAt: ago(1) },
  ],
};
const heard = (at: number, result: string, trigger?: string) => ({
  at,
  line: `email from ama: “Hi” → ${result}`,
  ...(trigger === undefined ? {} : { trigger }),
});
const launch: ManagerFacts = {
  managerId: "m1",
  name: "Launch",
  progress,
  decisions: [
    { trigger: "t1", kind: "accept", task: "DT-1" },
    { trigger: "t2", kind: "ignore", reason: "not work" },
  ],
  events: [
    heard(ago(0), "explicit candidate", "t1"),
    heard(ago(0), "inferred candidate", "t2"),
    heard(ago(1), "inferred candidate", "t3"),
    heard(ago(1), "follow-up on DT-1"),
    heard(ago(2), "ignored: not on the list"),
    heard(ago(90), "ignored: too old"),
    { at: ago(0), line: "something without an arrow" },
  ],
};
const item = (more: Partial<InboxItem>): InboxItem => ({
  id: "i1",
  kind: "question",
  to: "email:ama@example.test",
  managerId: "m1",
  managerName: "Launch",
  title: "Which one?",
  options: [],
  createdAt: ago(1),
  ...more,
});

describe("home", () => {
  const answered = { decision: "text", text: "x", byId: "a", byName: "A" } as const;
  const view = dashboards.home({
    now: NOW,
    managers: [launch],
    inbox: [
      item({ id: "old", createdAt: ago(3) }),
      item({ id: "new", createdAt: ago(0) }),
      item({ id: "done", answer: answered }),
      item({ id: "n", kind: "notice" }),
    ],
    canSeeTasks: true,
  });

  it("counts open tasks, running agents and what waits on people", () => {
    expect(view.tiles).toEqual({ openTasks: 3, runningAgents: 1, waitingOnPeople: 1, needsYou: 2 });
    expect(view.managers).toEqual([{ managerId: "m1", name: "Launch", openTasks: 3, runningAgents: 1, waitingOnPeople: 1 }]);
  });

  it("lists open Inbox items newest first, never notices or answered ones", () => {
    expect(view.needsYou.items.map(({ id }) => id)).toEqual(["new", "old"]);
  });

  it("gives thirty UTC days ending today, with tasks created and finished on their days", () => {
    expect(view.days).toHaveLength(DAYS);
    expect(view.days.at(-1)).toBe("2026-11-24");
    expect(view.created.at(-1)).toBe(1);
    expect(view.created.at(-2)).toBe(1);
    expect(view.created.reduce((a, b) => a + b, 0)).toBe(3);
    expect(view.finished.at(-3)).toBe(1);
  });

  it("counts heard lines per day by what became of them", () => {
    expect(view.events.accepted.at(-1)).toBe(1);
    expect(view.events.ignored.at(-1)).toBe(1);
    expect(view.events.waiting.at(-2)).toBe(1);
    expect(view.events.followup.at(-2)).toBe(1);
    expect(view.events.ignored.at(-3)).toBe(1);
    expect(view.events.ignored.reduce((a, b) => a + b, 0)).toBe(2);
  });

  it("leaves the task numbers out for a person who may not read tasks", () => {
    const hidden = dashboards.home({ now: NOW, managers: [launch], inbox: [], canSeeTasks: false });
    expect(hidden.canSeeTasks).toBe(false);
    expect(hidden.tiles).toMatchObject({ openTasks: 0, runningAgents: 0 });
    expect(hidden.managers).toEqual([]);
  });

  it("is all zeros for a new workspace", () => {
    const empty = dashboards.home({ now: NOW, managers: [], inbox: [], canSeeTasks: true });
    expect(empty.created.every((n) => n === 0)).toBe(true);
    expect(empty.needsYou).toEqual({ total: 0, items: [] });
  });
});

describe("overview", () => {
  const view = dashboards.overview({ now: NOW, manager: launch, mission: "Ship the release." });

  it("counts tasks by lane and marks the last lane done", () => {
    expect(view.lanes).toEqual([
      { id: "todo", name: "To do", count: 2, isDone: false },
      { id: "doing", name: "Doing", count: 1, isDone: false },
      { id: "done", name: "Done", count: 1, isDone: true },
    ]);
    expect(view.totals).toEqual({ tasks: 4, open: 3, done: 1, runningAgents: 1, waitingOnPeople: 1 });
  });

  it("burns down: tasks open at the end of each day", () => {
    expect(view.open.at(-1)).toBe(3);
    // The old task stays open all along; the changelog is open from day -5 until it is finished on day -2.
    expect(view.open.at(-3)).toBe(1);
    expect(view.open.at(-4)).toBe(2);
    expect(view.open.at(-6)).toBe(2);
  });

  it("lists tasks that need a person, with why", () => {
    expect(view.blocked).toEqual([
      { id: "DT-2", title: "Check the export", lane: "doing", reason: "Needs your answer", stage: "person.answer" },
    ]);
  });

  it("shows each agent's tasks and how many are done", () => {
    expect(view.agents).toEqual([{ agent: "writer", tasks: 2, done: 1, running: 1 }]);
  });

  it("reads the mission line past the headings", () => {
    expect(dashboards.missionLine("# Launch\n\n## What\n\nShip   the\nrelease.\n\n## How\n\nMore")).toBe("Ship the release.");
    expect(dashboards.missionLine("# Only a heading")).toBe("");
    expect(dashboards.missionLine("x".repeat(500)).length).toBeLessThanOrEqual(200);
  });
});
