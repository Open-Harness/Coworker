import type { Stage } from "~/modules/board/types.ts";
import { arrayOf as list, isRecord, textOf as text } from "~/modules/team-core/service.ts";
import type { BoardData, FieldData, FieldValue, LaneData, ModelState, TaskCard, View } from "../types.ts";

/* Narrows the server's JSON into the screens' shapes. Anything malformed is left out rather than shown wrong. */

const VIEWS: readonly View[] = ["kanban", "list", "console", "inbox"];
const STAGES: readonly Stage[] = ["person.answer", "person.review", "person.blocked", "queued", "idle", "working"];
const isView = (value: unknown): value is View => VIEWS.some((view) => view === value);
const isStage = (value: unknown): value is Stage => STAGES.some((stage) => stage === value);
const isFieldValue = (value: unknown): value is FieldValue =>
  value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";

const lane = (value: unknown): LaneData[] =>
  isRecord(value) && typeof value["id"] === "string"
    ? [{ id: value["id"], name: text(value["name"], value["id"]), needsApproval: value["needsApproval"] === true }]
    : [];

const field = (value: unknown): FieldData[] =>
  isRecord(value) && typeof value["key"] === "string" ? [{ key: value["key"], label: text(value["label"], value["key"]) }] : [];

const valuesOf = (value: unknown): Record<string, FieldValue> =>
  Object.fromEntries(Object.entries(isRecord(value) ? value : {}).filter((entry): entry is [string, FieldValue] => isFieldValue(entry[1])));

function task(value: unknown): TaskCard[] {
  if (!isRecord(value) || typeof value["id"] !== "string" || !isStage(value["stage"])) return [];
  const by = value["createdBy"];
  return [
    {
      id: value["id"],
      title: text(value["title"]),
      description: text(value["description"]),
      lane: text(value["lane"]),
      stage: value["stage"],
      stageLabel: text(value["stageLabel"]),
      createdBy: isRecord(by) ? text(by["name"]) : "",
      createdAt: typeof value["createdAt"] === "number" ? value["createdAt"] : 0,
      runs: list(value["runs"]).length,
      values: valuesOf(value["values"]),
    },
  ];
}

/** Without word that it cannot answer, a manager can: older servers say nothing. */
function modelOf(value: unknown): ModelState {
  if (!isRecord(value) || value["ready"] !== false) return { ready: true };
  return { ready: false, reason: text(value["reason"]), canFix: value["canFix"] === true };
}

/** `GET /api/workspaces/:id/managers/:id`: `{manager, board, model}`. */
export function decodeBoard(body: unknown): BoardData | undefined {
  if (!isRecord(body) || !isRecord(body["manager"]) || !isRecord(body["board"])) return undefined;
  const { manager, board } = { manager: body["manager"], board: body["board"] };
  if (typeof manager["managerId"] !== "string") return undefined;
  return {
    managerId: manager["managerId"],
    managerName: text(manager["name"]),
    address: text(manager["address"]),
    lanes: list(board["lanes"]).flatMap(lane),
    fields: list(board["fields"]).flatMap(field),
    defaultView: isView(board["defaultView"]) ? board["defaultView"] : "kanban",
    tasks: list(board["tasks"]).flatMap(task),
    model: modelOf(body["model"]),
  };
}
