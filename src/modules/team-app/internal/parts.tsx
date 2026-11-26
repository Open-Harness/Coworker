import { Badge } from "@astryxdesign/core/Badge";
import type { Stage } from "~/modules/board/types.ts";
import type { BoardData, FieldValue, LaneData, TaskCard } from "../types.ts";

const TONE: Readonly<Record<Stage, "warning" | "error" | "info" | "neutral">> = {
  "person.answer": "warning",
  "person.review": "warning",
  "person.blocked": "error",
  working: "info",
  queued: "neutral",
  idle: "neutral",
};

const isLastLane = (board: BoardData, laneId: string): boolean => board.lanes.length > 1 && board.lanes.at(-1)?.id === laneId;

/**
 * Only an open task has a stage (model.md "Stages"): one in the last lane waits for no run and no other thing. A person
 * it still needs, or an agent still on it, is worth saying wherever it is.
 */
const isSettled = (board: BoardData, task: TaskCard): boolean =>
  isLastLane(board, task.lane) && (task.stage === "queued" || task.stage === "idle");

/** Where a task waits, as model.md "Stages" words it. Undefined when it waits nowhere. */
export const stageWords = (board: BoardData, task: TaskCard): string | undefined => (isSettled(board, task) ? undefined : task.stageLabel);

export function StageBadge({ board, task }: { readonly board: BoardData; readonly task: TaskCard }) {
  const words = stageWords(board, task);
  return words === undefined ? null : <Badge variant={TONE[task.stage]} label={words} />;
}

type Dot = "success" | "warning" | "error" | "accent" | "neutral";

/** The same tone as a dot, where a badge would be too loud. */
export function stageTone(board: BoardData, task: TaskCard): Dot {
  if (isSettled(board, task)) return "success";
  const tone = TONE[task.stage];
  return tone === "info" ? "accent" : tone;
}

/** A lane that asks first is amber; the first is quiet, the last is done. */
export function laneTone(board: BoardData, lane: LaneData): Dot {
  if (lane.needsApproval) return "warning";
  if (isLastLane(board, lane.id)) return "success";
  return board.lanes[0]?.id === lane.id ? "neutral" : "accent";
}

export const needsPerson = (task: TaskCard): boolean => task.stage.startsWith("person.");

export const laneName = (board: BoardData, laneId: string): string => board.lanes.find(({ id }) => id === laneId)?.name ?? laneId;

export const shown = (value: FieldValue | undefined): string =>
  value === undefined || value === null ? "—" : typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);

/** "3 tasks · 1 agent working · 1 needs you". */
export function summary(board: BoardData): string {
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const working = board.tasks.filter(({ stage }) => stage === "working").length;
  const waiting = board.tasks.filter(needsPerson).length;
  return [
    count(board.tasks.length, "task", "tasks"),
    count(working, "agent working", "agents working"),
    count(waiting, "needs you", "need you"),
  ].join(" · ");
}

/** Who and how many agents are on a task. */
export const agentsOn = (task: TaskCard): string => (task.runs === 0 ? "None yet" : `${task.runs} ${task.runs === 1 ? "run" : "runs"}`);
