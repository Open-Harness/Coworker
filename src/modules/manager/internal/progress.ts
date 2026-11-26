import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import type { Harness } from "@earendil-works/pi-durable";
import type { ProgressView } from "../types.ts";
import { type BoardState, QuestionsDoc } from "./state.ts";
import { boardView } from "./views.ts";

/** The tasks a person has an open question about: they wait on that person, whatever the board's own counter says. */
export async function openQuestions(harness: Harness): Promise<ReadonlySet<string>> {
  const asked = await harness.snapshot(QuestionsDoc, BACKGROUND_CONTEXT);
  return new Set(Object.values(asked?.items ?? {}).flatMap(({ task, open }) => (open && task !== null ? [task.toUpperCase()] : [])));
}

/** What the dashboards count: no transcript, only each task's place and dates and each run's agent and state. */
export function progressView(board: Readonly<BoardState>, asked: ReadonlySet<string>): ProgressView {
  const last = board.lanes.length > 1 ? board.lanes.at(-1)?.id : undefined;
  return {
    lanes: board.lanes.map(({ id, name }) => ({ id, name })),
    tasks: boardView(board).tasks.map((task) => {
      const record = board.tasks[task.id];
      const finishedAt = last !== undefined && task.lane === last ? (record?.finishedAt ?? record?.settledAt) : undefined;
      const isAsking = asked.has(task.id) && !task.stage.startsWith("person.");
      return {
        id: task.id,
        title: task.title,
        lane: task.lane,
        stage: isAsking ? ("person.answer" as const) : task.stage,
        stageLabel: isAsking ? "Needs your answer" : task.stageLabel,
        createdAt: task.createdAt,
        ...(finishedAt === undefined ? {} : { finishedAt }),
        runs: task.runs,
      };
    }),
    runs: Object.values(board.runs).map(({ id, task, agent, state, startedAt }) => ({ id, task, agent, state, startedAt })),
  };
}
