import { arrayOf, each, isRecord, numberOf, textOf } from "~/modules/team-core/service.ts";
import type { Json, Server } from "~/modules/team-core/types.ts";
import type { EventsByOutcome, HomeApi, HomeData, OverviewData } from "../types.ts";

const at = (workspaceId: string, path: string): string => `/api/workspaces/${encodeURIComponent(workspaceId)}${path}`;

const numbers = (value: unknown): readonly number[] => arrayOf(value).map((one) => numberOf(one));
const words = (value: unknown): readonly string[] => arrayOf(value).map((one) => textOf(one));
const record = (value: unknown): Json => (isRecord(value) ? value : {});

function eventsOf(value: unknown): EventsByOutcome {
  const one = record(value);
  return {
    accepted: numbers(one["accepted"]),
    followup: numbers(one["followup"]),
    ignored: numbers(one["ignored"]),
    waiting: numbers(one["waiting"]),
  };
}

/** `GET …/home`. A body without its days is not one. */
export function decodeHome(body: unknown): HomeData | undefined {
  if (!isRecord(body) || !Array.isArray(body["days"])) return undefined;
  const tiles = record(body["tiles"]);
  const needs = record(body["needsYou"]);
  return {
    days: words(body["days"]),
    canSeeTasks: body["canSeeTasks"] !== false,
    tiles: {
      openTasks: numberOf(tiles["openTasks"]),
      runningAgents: numberOf(tiles["runningAgents"]),
      waitingOnPeople: numberOf(tiles["waitingOnPeople"]),
      needsYou: numberOf(tiles["needsYou"]),
    },
    created: numbers(body["created"]),
    finished: numbers(body["finished"]),
    events: eventsOf(body["events"]),
    managers: each(body["managers"], (row) => ({
      managerId: textOf(row["managerId"]),
      name: textOf(row["name"]),
      openTasks: numberOf(row["openTasks"]),
      runningAgents: numberOf(row["runningAgents"]),
      waitingOnPeople: numberOf(row["waitingOnPeople"]),
    })),
    needsYou: {
      total: numberOf(needs["total"]),
      items: each(needs["items"], (row) => ({
        id: textOf(row["id"]),
        title: textOf(row["title"]),
        managerName: textOf(row["managerName"]),
        kind: row["kind"] === "approval" ? ("approval" as const) : ("question" as const),
        createdAt: numberOf(row["createdAt"]),
      })),
    },
  };
}

/** `GET …/managers/<id>/overview`. */
export function decodeOverview(body: unknown): OverviewData | undefined {
  if (!isRecord(body) || !Array.isArray(body["days"])) return undefined;
  const totals = record(body["totals"]);
  return {
    days: words(body["days"]),
    managerId: textOf(body["managerId"]),
    name: textOf(body["name"]),
    mission: textOf(body["mission"]),
    lanes: each(body["lanes"], (row) => ({
      id: textOf(row["id"]),
      name: textOf(row["name"]),
      count: numberOf(row["count"]),
      isDone: row["isDone"] === true,
    })),
    totals: {
      tasks: numberOf(totals["tasks"]),
      open: numberOf(totals["open"]),
      done: numberOf(totals["done"]),
      runningAgents: numberOf(totals["runningAgents"]),
      waitingOnPeople: numberOf(totals["waitingOnPeople"]),
    },
    created: numbers(body["created"]),
    finished: numbers(body["finished"]),
    open: numbers(body["open"]),
    blocked: each(body["blocked"], (row) => ({
      id: textOf(row["id"]),
      title: textOf(row["title"]),
      lane: textOf(row["lane"]),
      reason: textOf(row["reason"]),
    })),
    agents: each(body["agents"], (row) => ({
      agent: textOf(row["agent"]),
      tasks: numberOf(row["tasks"]),
      done: numberOf(row["done"]),
      running: numberOf(row["running"]),
    })),
  };
}

export const createHomeApi = ({ read }: Server): HomeApi => ({
  home: (id) => read(at(id, "/home"), decodeHome),
  overview: (id, managerId) => read(at(id, `/managers/${encodeURIComponent(managerId)}/overview`), decodeOverview),
});
