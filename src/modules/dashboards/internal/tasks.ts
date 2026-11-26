import type { ProgressView } from "~/modules/manager/types.ts";
import { endOf, perDay } from "./days.ts";

type Task = ProgressView["tasks"][number];

/** The last lane means done, once a board has more than one. */
export const doneLane = (progress: ProgressView): string | undefined => (progress.lanes.length > 1 ? progress.lanes.at(-1)?.id : undefined);

export const isDone = (progress: ProgressView, task: Task): boolean => task.lane === doneLane(progress);

/** A task a person has to act on: answer, review or unblock. */
export const waitsOnPeople = (task: Task): boolean => task.stage.startsWith("person.");

export function counts(progress: ProgressView): {
  readonly open: number;
  readonly done: number;
  readonly running: number;
  readonly waiting: number;
} {
  const open = progress.tasks.filter((task) => !isDone(progress, task));
  return {
    open: open.length,
    done: progress.tasks.length - open.length,
    running: progress.runs.filter(({ state }) => state === "running").length,
    waiting: open.filter(waitsOnPeople).length,
  };
}

export const createdPerDay = (days: readonly string[], progress: ProgressView): readonly number[] =>
  perDay(
    days,
    progress.tasks.map(({ createdAt }) => createdAt),
  );

export const finishedPerDay = (days: readonly string[], progress: ProgressView): readonly number[] =>
  perDay(
    days,
    progress.tasks.flatMap((task) => (isDone(progress, task) && task.finishedAt !== undefined ? [task.finishedAt] : [])),
  );

/** Tasks that existed and were not finished at the end of each day. */
export const openPerDay = (days: readonly string[], progress: ProgressView): readonly number[] =>
  days.map((day) => {
    const end = endOf(day);
    return progress.tasks.filter((task) => {
      if (task.createdAt > end) return false;
      return !(isDone(progress, task) && task.finishedAt !== undefined && task.finishedAt <= end);
    }).length;
  });

export const sumSeries = (series: readonly (readonly number[])[], length: number): readonly number[] =>
  Array.from({ length }, (_, index) => series.reduce((sum, one) => sum + (one[index] ?? 0), 0));
