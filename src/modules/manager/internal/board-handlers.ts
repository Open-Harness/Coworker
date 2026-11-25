import type { Tx } from "@earendil-works/pi-durable";
import type { By, Handler } from "~/modules/actions/types.ts";
import type { Field, Lane, View } from "../types.ts";
import { BoardDoc, type BoardState, type ByRecord, type TaskRecord } from "./state.ts";

/*
 * The board's own settings and a task's values and comments: lanes, fields, the first view, and what a task holds.
 * The same handlers answer a person's button and the manager's tool.
 */

type Input = Readonly<Record<string, unknown>>;
type Handled = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly message: string };

const done = (value: unknown): Handled => ({ ok: true, value });
const cannot = (message: string): Handled => ({ ok: false, message });
const text = (input: Input, key: string): string | undefined => (typeof input[key] === "string" ? input[key].trim() : undefined);
const record = (by: By): ByRecord => ({ kind: by.kind, id: by.id, name: by.name });
const VIEWS: readonly string[] = ["kanban", "list", "console", "inbox"];
const TYPES: readonly string[] = ["select", "text", "number", "date", "person"];
const TONES: readonly string[] = ["red", "amber", "green"];
const MAX_LANES = 12;
const MAX_FIELDS = 12;

const slug = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 40);

export const taskIn = (board: BoardState, name: string | undefined): TaskRecord | undefined => {
  const number = /^(?:dt-)?(\d+)$/iu.exec(name?.trim() ?? "")?.[1];
  return number === undefined ? undefined : board.tasks[`DT-${number}`];
};

const laneIn = (board: BoardState, name: string | undefined): Lane | undefined =>
  board.lanes.find(({ id, name: label }) => id === name || label.toLowerCase() === name?.toLowerCase());

function laneFrom(input: Input, lane: Lane): Handled | undefined {
  const name = text(input, "name");
  if (name !== undefined && (name === "" || name.length > 40)) return cannot("A lane needs a name of up to 40 characters");
  if ("needsApproval" in input && typeof input["needsApproval"] !== "boolean") return cannot("needsApproval is true or false");
  const limit = input["limit"];
  if (limit !== undefined && limit !== null && !(typeof limit === "number" && Number.isInteger(limit) && limit >= 1 && limit <= 1000))
    return cannot("A limit is a whole number from 1 to 1000, or null for none");
  if (name !== undefined) lane.name = name;
  if (typeof input["meaning"] === "string") lane.meaning = input["meaning"].trim().slice(0, 200);
  if (typeof input["needsApproval"] === "boolean") lane.needsApproval = input["needsApproval"];
  if (limit === null) delete lane.limit;
  else if (typeof limit === "number") lane.limit = limit;
  return undefined;
}

function createLane(board: BoardState, input: Input): Handled {
  const name = text(input, "name") ?? "";
  const id = slug(name);
  if (id === "") return cannot("A lane needs a name");
  if (board.lanes.length >= MAX_LANES) return cannot(`A board has at most ${MAX_LANES} lanes`);
  if (board.lanes.some((lane) => lane.id === id || lane.name.toLowerCase() === name.toLowerCase()))
    return cannot(`There is already a lane ${name}`);
  const lane: Lane = { id, name: name.slice(0, 40), meaning: "", needsApproval: false };
  const refused = laneFrom({ ...input, name: undefined }, lane);
  if (refused !== undefined) return refused;
  board.lanes.push(lane);
  return done({ lane: id, name: lane.name });
}

function updateLane(board: BoardState, input: Input): Handled {
  const lane = laneIn(board, text(input, "lane"));
  if (lane === undefined) return cannot(`There is no lane ${String(input["lane"])}`);
  const clash = board.lanes.find((other) => other.id !== lane.id && other.name.toLowerCase() === text(input, "name")?.toLowerCase());
  if (clash !== undefined) return cannot(`There is already a lane ${clash.name}`);
  return laneFrom(input, lane) ?? done({ lane: lane.id });
}

function reorderLanes(board: BoardState, input: Input): Handled {
  const order = Array.isArray(input["order"]) ? input["order"].filter((id): id is string => typeof id === "string") : [];
  const sorted = (ids: readonly string[]) => [...ids].sort().join("\n");
  if (sorted(order) !== sorted(board.lanes.map(({ id }) => id))) return cannot("Name every lane once, by its id");
  board.lanes = order.flatMap((id) => board.lanes.find((lane) => lane.id === id) ?? []);
  return done({ order });
}

function deleteLane(board: BoardState, input: Input): Handled {
  const lane = laneIn(board, text(input, "lane"));
  if (lane === undefined) return cannot(`There is no lane ${String(input["lane"])}`);
  if (Object.values(board.tasks).some((task) => task.lane === lane.id)) return cannot(`${lane.name} still has tasks. Move them first`);
  if (board.lanes.length === 1) return cannot("A board keeps at least one lane");
  board.lanes = board.lanes.filter(({ id }) => id !== lane.id);
  return done({ lane: lane.id });
}

function optionsOf(value: unknown): Extract<Field, { type: "select" }>["options"] | undefined {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) return undefined;
  const options = value.map((option: unknown) => {
    const [name, tone] =
      typeof option === "string" ? [option, undefined] : [(option as { value?: unknown })?.value, (option as { tone?: unknown })?.tone];
    if (typeof name !== "string" || name.trim() === "" || name.length > 40) return undefined;
    if (tone !== undefined && !(typeof tone === "string" && TONES.includes(tone))) return undefined;
    return { value: name.trim(), ...(tone === undefined ? {} : { tone: tone as "red" | "amber" | "green" }) };
  });
  return options.every((option) => option !== undefined) && new Set(options.map((option) => option?.value)).size === options.length
    ? (options as Extract<Field, { type: "select" }>["options"])
    : undefined;
}

function createField(board: BoardState, input: Input): Handled {
  const label = text(input, "label") ?? "";
  const key = slug(label).replaceAll("-", "_");
  const type = text(input, "type") ?? "text";
  if (key === "" || label.length > 40) return cannot("A field needs a label of up to 40 characters");
  if (!TYPES.includes(type)) return cannot(`A field's type is one of ${TYPES.join(", ")}`);
  if (board.fields.length >= MAX_FIELDS) return cannot(`A board has at most ${MAX_FIELDS} fields`);
  if (board.fields.some((field) => field.key === key)) return cannot(`There is already a field ${label}`);
  if (type !== "select") {
    board.fields.push({ key, label, type } as Field);
    return done({ field: key, label });
  }
  const options = optionsOf(input["options"]);
  if (options === undefined) return cannot("A select field needs options: names, each with an optional tone of red, amber or green");
  board.fields.push({ key, label, type: "select", options });
  return done({ field: key, label });
}

function updateField(board: BoardState, input: Input): Handled {
  const key = text(input, "field");
  const field = board.fields.find((candidate) => candidate.key === key);
  if (field === undefined) return cannot(`There is no field ${String(key)}`);
  const label = text(input, "label");
  if (label !== undefined && (label === "" || label.length > 40)) return cannot("A field needs a label of up to 40 characters");
  if ("options" in input) {
    if (field.type !== "select") return cannot(`${field.label} has no options`);
    const options = optionsOf(input["options"]);
    if (options === undefined) return cannot("Options are names, each with an optional tone of red, amber or green");
    // A value a task holds must stay one of them.
    for (const task of Object.values(board.tasks)) {
      const held = task.values[field.key];
      if (typeof held === "string" && !options.some(({ value }) => value === held))
        return cannot(`${task.id} holds ${held}, which is not among the options`);
    }
    field.options = options;
  }
  if (label !== undefined) field.label = label;
  return done({ field: field.key });
}

function deleteField(board: BoardState, input: Input): Handled {
  const key = text(input, "field");
  if (!board.fields.some((field) => field.key === key)) return cannot(`There is no field ${String(key)}`);
  board.fields = board.fields.filter((field) => field.key !== key);
  for (const task of Object.values(board.tasks)) delete task.values[key ?? ""];
  return done({ field: key });
}

/** One value for a field, or why it does not fit. `null` clears it. */
function valueFor(
  field: Field,
  value: unknown,
): { readonly ok: true; readonly value: string | number | null } | { readonly ok: false; readonly why: string } {
  if (value === null) return { ok: true, value: null };
  if (field.type === "number")
    return typeof value === "number" && Number.isFinite(value) ? { ok: true, value } : { ok: false, why: "a number" };
  if (typeof value !== "string" || value.length > 500) return { ok: false, why: "text of up to 500 characters" };
  if (field.type === "date")
    return /^\d{4}-\d{2}-\d{2}$/u.test(value) && !Number.isNaN(Date.parse(value))
      ? { ok: true, value }
      : { ok: false, why: "a date, YYYY-MM-DD" };
  if (field.type === "select")
    return field.options.some((option) => option.value === value)
      ? { ok: true, value }
      : { ok: false, why: `one of ${field.options.map((option) => option.value).join(", ")}` };
  return { ok: true, value };
}

function setValues(board: BoardState, input: Input): Handled {
  const task = taskIn(board, text(input, "task"));
  if (task === undefined) return cannot(`There is no task ${String(input["task"])}`);
  const values = input["values"];
  if (typeof values !== "object" || values === null || Array.isArray(values) || Object.keys(values).length === 0)
    return cannot("Send values: {field: value}");
  const next: { [key: string]: string | number | null } = {};
  for (const [key, value] of Object.entries(values)) {
    const field = board.fields.find((candidate) => candidate.key === key);
    if (field === undefined) return cannot(`There is no field ${key}`);
    const checked = valueFor(field, value);
    if (!checked.ok) return cannot(`${field.label} is ${checked.why}`);
    next[key] = checked.value;
  }
  for (const [key, value] of Object.entries(next)) {
    if (value === null) delete task.values[key];
    else task.values[key] = value;
  }
  return done({ task: task.id, values: next });
}

function setOwner(board: BoardState, input: Input): Handled {
  const task = taskIn(board, text(input, "task"));
  if (task === undefined) return cannot(`There is no task ${String(input["task"])}`);
  const owner = input["owner"] === null ? null : text(input, "owner");
  if (owner === undefined || owner === "" || (owner !== null && owner.length > 120))
    return cannot("The owner is a person's id, such as email:ama@acme.com, or null for none");
  if (owner === null) delete task.owner;
  else task.owner = owner;
  return done({ task: task.id, owner });
}

function comment(board: BoardState, input: Input, by: By, now: number): Handled {
  const task = taskIn(board, text(input, "task"));
  if (task === undefined) return cannot(`There is no task ${String(input["task"])}`);
  const words = text(input, "text") ?? "";
  if (words === "" || words.length > 10_000) return cannot("A comment has words, up to 10,000 characters");
  // Written through the task, so the document sees the new array: a list made and pushed to aside is not tracked.
  task.comments ??= [];
  const id = `c${task.comments.length + 1}`;
  task.comments.push({ id, by: record(by), at: now, text: words });
  if (by.kind === "person") task.lastPersonWriteAt = now;
  return done({ task: task.id, comment: id });
}

/** Lanes, fields, the first view, a task's values and its comments. */
export function boardHandlers(tx: Tx, now: () => number): Readonly<Record<string, Handler>> {
  const board = () => tx.doc(BoardDoc);
  return {
    "lane.create": async (input) => createLane(await board(), input),
    "lane.update": async (input) => updateLane(await board(), input),
    "lane.reorder": async (input) => reorderLanes(await board(), input),
    "lane.delete": async (input) => deleteLane(await board(), input),
    "field.create": async (input) => createField(await board(), input),
    "field.update": async (input) => updateField(await board(), input),
    "field.delete": async (input) => deleteField(await board(), input),
    "view.default": async (input) => {
      const view = text(input, "view");
      if (view === undefined || !VIEWS.includes(view)) return cannot(`The view is one of ${VIEWS.join(", ")}`);
      (await board()).defaultView = view as View;
      return done({ view });
    },
    "task.values": async (input) => setValues(await board(), input),
    "task.owner": async (input) => setOwner(await board(), input),
    "task.comment": async (input, by) => comment(await board(), input, by, now()),
  };
}
