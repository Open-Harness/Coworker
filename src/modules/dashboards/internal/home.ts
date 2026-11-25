import type { InboxItem } from "~/modules/workspace/types.ts";
import { DAYS, type HomeView, type ManagerFacts } from "../types.ts";
import { lastDays } from "./days.ts";
import { eventsByOutcome } from "./events.ts";
import { counts, createdPerDay, finishedPerDay, sumSeries } from "./tasks.ts";

const RAIL = 20;

export function home(input: {
  readonly now: number;
  readonly managers: readonly ManagerFacts[];
  readonly inbox: readonly InboxItem[];
  readonly canSeeTasks: boolean;
}): HomeView {
  const days = lastDays(input.now);
  const seen = input.canSeeTasks ? input.managers : [];
  const per = seen.map(({ managerId, name, progress }) => ({ managerId, name, ...counts(progress) }));
  const open = input.inbox
    .filter(({ answer, kind }) => answer === undefined && kind !== "notice")
    .sort((a, b) => b.createdAt - a.createdAt);
  return {
    days,
    canSeeTasks: input.canSeeTasks,
    tiles: {
      openTasks: per.reduce((sum, one) => sum + one.open, 0),
      runningAgents: per.reduce((sum, one) => sum + one.running, 0),
      waitingOnPeople: per.reduce((sum, one) => sum + one.waiting, 0),
      needsYou: open.length,
    },
    created: sumSeries(
      seen.map(({ progress }) => createdPerDay(days, progress)),
      DAYS,
    ),
    finished: sumSeries(
      seen.map(({ progress }) => finishedPerDay(days, progress)),
      DAYS,
    ),
    events: eventsByOutcome(days, input.managers),
    managers: per.map(({ managerId, name, open: openTasks, running, waiting }) => ({
      managerId,
      name,
      openTasks,
      runningAgents: running,
      waitingOnPeople: waiting,
    })),
    needsYou: {
      total: open.length,
      items: open.slice(0, RAIL).map(({ id, title, managerName, kind, createdAt }) => ({ id, title, managerName, kind, createdAt })),
    },
  };
}
