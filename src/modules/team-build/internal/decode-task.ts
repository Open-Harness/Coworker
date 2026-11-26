import { arrayOf, each, isRecord, numberOf, textOf, wordsOf } from "~/modules/team-core/service.ts";
import type { Json } from "~/modules/team-core/types.ts";
import type { FieldValue, Pressed, RunData, RunSummary, TaskPage } from "../types.ts";

/* One task and one run, as the server sends them. */

const nameOf = (by: unknown): string => (isRecord(by) ? textOf(by["name"]) : "");
const isValue = (value: unknown): value is FieldValue =>
  value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";

export function decodeRunSummary(row: Json): RunSummary | undefined {
  const state = row["state"];
  if (typeof row["id"] !== "string" || (state !== "queued" && state !== "running" && state !== "ended")) return undefined;
  return { id: row["id"], role: textOf(row["role"]), agent: textOf(row["agent"]), attempt: numberOf(row["attempt"], 1), state };
}

/** `GET …/tasks/DT-n`: `{task: {task, owner?, comments, history, runs, mandate?}}`. */
export function decodeTask(body: unknown): TaskPage | undefined {
  const detail = isRecord(body) ? body["task"] : undefined;
  const task = isRecord(detail) && isRecord(detail["task"]) ? detail["task"] : undefined;
  if (!isRecord(detail) || task === undefined || typeof task["id"] !== "string") return undefined;
  const owner = wordsOf(detail["owner"]);
  const mandate = isRecord(detail["mandate"]) ? detail["mandate"] : undefined;
  const values = isRecord(task["values"]) ? task["values"] : {};
  return {
    id: task["id"],
    title: textOf(task["title"]),
    description: textOf(task["description"]),
    lane: textOf(task["lane"]),
    stageLabel: textOf(task["stageLabel"]),
    values: Object.fromEntries(Object.entries(values).filter((entry): entry is [string, FieldValue] => isValue(entry[1]))),
    ...(owner === undefined ? {} : { owner }),
    comments: each(detail["comments"], (row) =>
      typeof row["id"] === "string"
        ? { id: row["id"], by: nameOf(row["by"]), at: numberOf(row["at"]), text: textOf(row["text"]) }
        : undefined,
    ),
    history: each(detail["history"], (row) => ({ at: numberOf(row["at"]), by: nameOf(row["by"]), sentence: textOf(row["sentence"]) })),
    runs: each(detail["runs"], decodeRunSummary),
    ...(mandate === undefined
      ? {}
      : {
          mandate: {
            trigger: textOf(mandate["trigger"]),
            strength: textOf(mandate["strength"]),
            source: textOf(mandate["source"]),
            sender: textOf(mandate["sender"]),
          },
        }),
  };
}

/** `GET …/runs/<id>`: `{_tag: "Run", run, lines}`. */
export function decodeRun(body: unknown): RunData | undefined {
  if (!isRecord(body) || !isRecord(body["run"])) return undefined;
  const summary = decodeRunSummary(body["run"]);
  if (summary === undefined) return undefined;
  const report = wordsOf(body["run"]["report"]);
  const note = wordsOf(body["run"]["note"]);
  const stopped = isRecord(body["run"]["stopped"]) ? body["run"]["stopped"] : undefined;
  return {
    ...summary,
    task: textOf(body["run"]["task"]),
    ...(report === undefined ? {} : { report: { outcome: report, summary: note ?? "" } }),
    ...(note === undefined ? {} : { note }),
    ...(stopped === undefined ? {} : { stopped: { by: nameOf(stopped["by"]), at: numberOf(stopped["at"]) } }),
    lines: arrayOf(body["lines"]).flatMap((line) => {
      if (!isRecord(line) || typeof line["id"] !== "string") return [];
      const role = line["role"];
      if (role !== "person" && role !== "manager" && role !== "action") return [];
      return [{ id: line["id"], role, text: textOf(line["text"]), ...(line["streaming"] === true ? { streaming: true as const } : {}) }];
    }),
  };
}

/** A button: `Done` (200), or `Ask` (202) when an Owner has to allow it first. */
export function decodePressed(body: unknown): Pressed | undefined {
  if (!isRecord(body)) return undefined;
  if (body["_tag"] === "Done") return { _tag: "Done" };
  return body["_tag"] === "Ask" ? { _tag: "Waiting", sentence: textOf(body["sentence"]) } : undefined;
}
