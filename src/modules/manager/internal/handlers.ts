import type { Tx } from "@earendil-works/pi-durable";
import type { By, Handler } from "~/modules/actions/types.ts";
import type { Mounted } from "~/modules/agent-engine/types.ts";
import { boardHandlers } from "./board-handlers.ts";
import { detailOf } from "./detail.ts";
import { permissionsHandlers } from "./permissions-handlers.ts";
import type { Launch } from "./launch.ts";
import { startRun } from "./runs.ts";
import { stopHandler } from "./stop.ts";
import { triageHandlers } from "./triage.ts";
import { BoardDoc, type BoardState, type ByRecord, MISSION, PagesDoc, type PagesState } from "./state.ts";

/** What a handler answers: a value for the caller, or why it could not do it. */
export type Handled = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly message: string };

const done = (value: unknown): Handled => ({ ok: true, value });
const cannot = (message: string): Handled => ({ ok: false, message });

const text = (input: Readonly<Record<string, unknown>>, key: string): string | undefined =>
  typeof input[key] === "string" ? input[key] : undefined;

const listedOptions = (input: Readonly<Record<string, unknown>>): string[] =>
  Array.isArray(input["options"]) ? input["options"].filter((option) => typeof option === "string") : [];

const byRecord = (by: By): ByRecord => ({ kind: by.kind, id: by.id, name: by.name });

/** `DT-14`, `dt-14` or `14` all name task 14. */
const taskIn = (board: BoardState, name: string | undefined) => {
  const number = /^(?:dt-)?(\d+)$/iu.exec(name?.trim() ?? "")?.[1];
  return number === undefined ? undefined : board.tasks[`DT-${number}`];
};

function createTask(board: BoardState, input: Readonly<Record<string, unknown>>, by: By, now: number): Handled {
  const title = text(input, "title")?.trim();
  if (title === undefined || title === "") return cannot("A task needs a title");
  const lane = text(input, "lane") ?? board.lanes[0]?.id;
  if (lane === undefined || !board.lanes.some(({ id }) => id === lane)) return cannot(`There is no lane ${String(lane)}`);
  const id = `DT-${board.nextNumber}`;
  board.nextNumber += 1;
  board.tasks[id] = {
    id,
    title,
    description: text(input, "description") ?? "",
    lane,
    values: {},
    createdBy: byRecord(by),
    createdAt: now,
    archived: false,
    runs: [],
    questions: 0,
    ...(by.kind === "person" ? { lastPersonWriteAt: now } : {}),
  };
  return done({ task: id, title, lane });
}

function moveTask(board: BoardState, input: Readonly<Record<string, unknown>>, by: By, now: number): Handled {
  const task = taskIn(board, text(input, "task"));
  if (task === undefined) return cannot(`There is no task ${String(input["task"])}`);
  const lane = text(input, "lane");
  const target = board.lanes.find(({ id, name }) => id === lane || name.toLowerCase() === lane?.toLowerCase());
  if (target === undefined) return cannot(`There is no lane ${String(lane)}`);
  task.lane = target.id;
  if (board.lanes.length > 1 && board.lanes.at(-1)?.id === target.id) task.finishedAt ??= now;
  else delete task.finishedAt;
  // A person who puts a task in the last lane has settled it; any other move, or a move out, takes that back.
  if (by.kind === "person" && board.lanes.length > 1 && board.lanes.at(-1)?.id === target.id) {
    task.settledAt = now;
    task.lastPersonWriteAt = now;
  } else delete task.settledAt;
  return done({ task: task.id, lane: target.id });
}

function updateTask(board: BoardState, input: Readonly<Record<string, unknown>>): Handled {
  const task = taskIn(board, text(input, "task"));
  if (task === undefined) return cannot(`There is no task ${String(input["task"])}`);
  task.title = text(input, "title") ?? task.title;
  task.description = text(input, "description") ?? task.description;
  return done({ task: task.id });
}

function writePage(pages: PagesState, id: string, change: { parent: string | null; title: string; body: string }, by: By, now: number) {
  if (pages.pages[id] === undefined) pages.order.push(id);
  pages.pages[id] = { id, ...change, updatedAt: now, updatedBy: byRecord(by) };
}

function createPage(pages: PagesState, input: Readonly<Record<string, unknown>>, by: By, now: number): Handled {
  const title = text(input, "title")?.trim();
  if (title === undefined || title === "") return cannot("A page needs a title");
  const parent = text(input, "parent") ?? MISSION;
  if (pages.pages[parent] === undefined) return cannot(`There is no page ${parent}`);
  const id = `page-${pages.order.length}`;
  writePage(pages, id, { parent, title, body: text(input, "body") ?? "" }, by, now);
  return done({ page: id, title });
}

function updatePage(pages: PagesState, id: string | undefined, input: Readonly<Record<string, unknown>>, by: By, now: number): Handled {
  const page = id === undefined ? undefined : pages.pages[id];
  if (page === undefined) return cannot(`There is no page ${String(id)}`);
  // Whoever read the page says which version they read; a newer one is not written over without their knowing.
  const base = input["base"];
  if (typeof base === "number" && base !== page.updatedAt)
    return cannot(`${page.updatedBy.name} changed "${page.title}" after you opened it. Nothing was saved`);
  const title = text(input, "title") ?? page.title;
  writePage(pages, page.id, { parent: page.parent, title, body: text(input, "body") ?? page.body }, by, now);
  return done({ page: page.id, title });
}

/** The actions a manager can already carry out, each changing its documents inside one transaction. */
export function handlersFor(tx: Tx, now: () => number, worker: Mounted, launch?: Launch): Readonly<Record<string, Handler>> {
  const board = () => tx.doc(BoardDoc);
  const pages = () => tx.doc(PagesDoc);
  return {
    ...triageHandlers(tx, now, createTask),
    ...boardHandlers(tx, now),
    ...permissionsHandlers(tx),
    "board.read": async () => done(await board()),
    "task.read": async (input) => {
      const task = taskIn(await board(), text(input, "task"));
      return task === undefined ? cannot(`There is no task ${String(input["task"])}`) : done(task);
    },
    "task.create": async (input, by) => createTask(await board(), input, by, now()),
    "task.move": async (input, by) => moveTask(await board(), input, by, now()),
    "task.update": async (input) => updateTask(await board(), input),
    "run.start": async (input, by) => {
      const agent = text(input, "agent");
      const brief = text(input, "brief");
      const wanted = {
        task: text(input, "task") ?? "",
        role: text(input, "role") ?? "",
        ...(agent === undefined ? {} : { agent }),
        ...(brief === undefined ? {} : { brief }),
      };
      const started = await startRun(tx, await board(), wanted, by, worker, now(), launch);
      return "cannot" in started ? cannot(started.cannot) : done(started);
    },
    "run.stop": stopHandler(tx, now),
    "run.read": async (input) => {
      const run = (await board()).runs[text(input, "run") ?? ""];
      return run === undefined ? cannot(`There is no run ${String(input["run"])}`) : done(run);
    },
    "task.delete": async (input) => {
      const state = await board();
      const found = taskIn(state, text(input, "task"));
      if (found === undefined) return cannot(`There is no task ${String(input["task"])}`);
      delete state.tasks[found.id];
      return done({ task: found.id });
    },
    "question.ask": async (input) => {
      const id = text(input, "id")?.trim();
      const question = text(input, "question")?.trim();
      if (id === undefined || id === "" || question === undefined || question === "") return cannot("A question needs an id and its words");
      const state = await board();
      const about = text(input, "task") === undefined ? undefined : taskIn(state, text(input, "task"));
      if (text(input, "task") !== undefined && about === undefined) return cannot(`There is no task ${String(input["task"])}`);
      const detail = detailOf(state, await pages(), input);
      const options = detail?.choices.length ? detail.choices.map(({ label }) => label) : listedOptions(input);
      const to = text(input, "to");
      return done({
        id,
        question,
        options,
        ...(detail === undefined ? {} : { detail }),
        ...(to === undefined ? {} : { to }),
        ...(about === undefined ? {} : { task: about.id }),
      });
    },
    "mission.read": async () => done(await pages()),
    "mission.update": async (input, by) => updatePage(await pages(), MISSION, input, by, now()),
    "page.create": async (input, by) => createPage(await pages(), input, by, now()),
    "page.update": async (input, by) => updatePage(await pages(), text(input, "page"), input, by, now()),
  };
}
