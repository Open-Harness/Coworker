import type { ManagerFacts, OverviewView } from "../types.ts";
import { lastDays } from "./days.ts";
import { counts, createdPerDay, doneLane, finishedPerDay, isDone, openPerDay, waitsOnPeople } from "./tasks.ts";

export function overview(input: { readonly now: number; readonly manager: ManagerFacts; readonly mission: string }): OverviewView {
  const { manager, now, mission } = input;
  const { progress } = manager;
  const days = lastDays(now);
  const total = counts(progress);
  const taskOf = new Map(progress.tasks.map((task) => [task.id, task]));
  const byAgent = new Map<string, { tasks: Set<string>; done: Set<string>; running: number }>();
  for (const run of progress.runs) {
    const entry = byAgent.get(run.agent) ?? { tasks: new Set<string>(), done: new Set<string>(), running: 0 };
    const task = taskOf.get(run.task);
    if (task !== undefined) {
      entry.tasks.add(task.id);
      if (isDone(progress, task)) entry.done.add(task.id);
    }
    if (run.state === "running") entry.running += 1;
    byAgent.set(run.agent, entry);
  }
  return {
    days,
    managerId: manager.managerId,
    name: manager.name,
    mission,
    lanes: progress.lanes.map(({ id, name }) => ({
      id,
      name,
      count: progress.tasks.filter(({ lane }) => lane === id).length,
      isDone: id === doneLane(progress),
    })),
    totals: {
      tasks: progress.tasks.length,
      open: total.open,
      done: total.done,
      runningAgents: total.running,
      waitingOnPeople: total.waiting,
    },
    created: createdPerDay(days, progress),
    finished: finishedPerDay(days, progress),
    open: openPerDay(days, progress),
    blocked: progress.tasks
      .filter((task) => !isDone(progress, task) && waitsOnPeople(task))
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(({ id, title, lane, stage, stageLabel }) => ({ id, title, lane, reason: stageLabel, stage })),
    agents: [...byAgent.entries()]
      .map(([agent, { tasks, done, running }]) => ({ agent, tasks: tasks.size, done: done.size, running }))
      .sort((a, b) => b.tasks - a.tasks || a.agent.localeCompare(b.agent)),
  };
}
