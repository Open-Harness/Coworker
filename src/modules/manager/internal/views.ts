import type { EntryRecord, Tx } from "@earendil-works/pi-durable";
import { boardRules } from "~/modules/board/service.ts";
import { AuthoredEntry, messageText, withoutAttribution } from "~/modules/transcript/service.ts";
import type { BoardView, ChatLine, ManagerProfile, PageView, ProvisionResult, RunView, TaskView } from "../types.ts";
import type { Searchable } from "~/modules/search/types.ts";
import {
  BoardDoc,
  type BoardState,
  MISSION,
  PagesDoc,
  type PagesState,
  PermissionsDoc,
  ProfileDoc,
  type RunRecord,
  type TaskRecord,
} from "./state.ts";
import { questionItemId } from "./call.ts";
import { missionPage, TEMPLATES } from "./templates.ts";

/** Writes a new manager's documents from its template, once. */
export async function setUp(tx: Tx, profile: ManagerProfile): Promise<void> {
  const template = TEMPLATES[profile.template];
  (await tx.doc(ProfileDoc)).profile = { ...profile };
  const board = await tx.doc(BoardDoc);
  board.lanes = template.lanes.map((lane) => ({ ...lane }));
  board.fields = template.fields.map((field) => structuredClone(field));
  board.defaultView = template.defaultView;
  const pages = await tx.doc(PagesDoc);
  pages.order = [MISSION];
  pages.pages = {
    [MISSION]: {
      id: MISSION,
      parent: null,
      title: profile.name,
      body: missionPage(profile.name, profile.mission ?? template.purpose),
      updatedAt: profile.createdAt,
      updatedBy: { kind: "person", id: profile.createdBy, name: "Template" },
    },
  };
  const permissions = await tx.doc(PermissionsDoc);
  permissions.categories = { ...template.permissions.categories };
  permissions.actions = { ...template.permissions.actions };
}

/** Sets the manager up unless it already was: the check and the write are one transaction. */
export async function provisionOnce(tx: Tx, profile: ManagerProfile): Promise<ProvisionResult> {
  const existing = (await tx.doc(ProfileDoc)).profile;
  if (existing !== undefined) return { _tag: "AlreadyProvisioned", managerId: existing.managerId };
  await setUp(tx, profile);
  return { _tag: "Provisioned" };
}

export const runView = (run: RunRecord): RunView => ({
  id: run.id,
  task: run.task,
  role: run.role,
  agent: run.agent,
  ...(run.saved === undefined ? {} : { agentVersion: run.saved.version }),
  ...(run.model === undefined ? {} : { model: { ...run.model } }),
  ...(run.modelNotice === undefined ? {} : { modelNotice: run.modelNotice }),
  attempt: run.attempt,
  state: run.state,
  ...(run.report === undefined ? {} : { report: run.report }),
  ...(run.note === undefined ? {} : { note: run.note }),
  ...(run.stopped === undefined ? {} : { stopped: { at: run.stopped.at, by: { ...run.stopped.by } } }),
  startedBy: { ...run.startedBy },
});

/** Settled while it sits in the last lane where a person put it, and no run has reported since. */
const isSettled = (task: TaskRecord, lanes: BoardState["lanes"], runs: Readonly<Record<string, RunRecord>>): boolean =>
  task.settledAt !== undefined &&
  task.questions === 0 &&
  lanes.length > 1 &&
  lanes.at(-1)?.id === task.lane &&
  task.runs.every((id) => (runs[id]?.reportedAt ?? 0) <= (task.settledAt ?? 0));

const taskView = (task: TaskRecord, lanes: BoardState["lanes"], runs: Readonly<Record<string, RunRecord>>): TaskView => {
  const settled = isSettled(task, lanes, runs);
  const facts = task.runs.flatMap((id) => {
    const run = runs[id];
    if (run === undefined) return [];
    return [
      {
        state: run.state,
        ...(run.report === undefined ? {} : { report: run.report }),
        ...(run.reportedAt === undefined ? {} : { reportedAt: run.reportedAt }),
      },
    ];
  });
  const open = boardRules.stageOf({
    openQuestions: task.questions,
    runs: facts,
    ...(task.lastPersonWriteAt === undefined ? {} : { lastPersonWriteAt: task.lastPersonWriteAt }),
  });
  // A settled task is not open (model.md "Stages"), so it waits in no stage; `idle` is the one the screens already hide.
  const { stage, label } = settled ? { stage: "idle" as const, label: "" } : open;
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    lane: task.lane,
    values: { ...task.values },
    stage,
    stageLabel: label,
    settled,
    createdBy: { ...task.createdBy },
    createdAt: task.createdAt,
    runs: [...task.runs],
  };
};

export const boardView = (board: Readonly<BoardState>): BoardView => ({
  lanes: board.lanes.map((lane) => ({ ...lane })),
  fields: board.fields.map((field) => structuredClone(field)),
  defaultView: board.defaultView,
  tasks: Object.values(board.tasks)
    .filter(({ archived }) => !archived)
    .map((task) => taskView(task, board.lanes, board.runs)),
});

export const pageViews = (pages: Readonly<{ order: readonly string[]; pages: Readonly<Record<string, PageView>> }>): readonly PageView[] =>
  pages.order.flatMap((id) => {
    const page = pages.pages[id];
    return page === undefined ? [] : [{ ...page, updatedBy: { ...page.updatedBy } }];
  });

const resultText = (content: readonly unknown[]): string =>
  content
    .map((part) => (typeof part === "object" && part !== null && "text" in part && typeof part.text === "string" ? part.text : ""))
    .join("\n");

/** The questions a message asks a person (`question.ask` calls), unless a result says the call did not make one. */
function questionsAsked(message: { readonly content?: unknown }, failed: ReadonlySet<string>, managerId: string): ChatLine[] {
  if (!Array.isArray(message.content)) return [];
  return message.content.flatMap((part: unknown): ChatLine[] => {
    if (typeof part !== "object" || part === null || !("type" in part) || part.type !== "toolCall") return [];
    const { id, name, arguments: args } = part as { id?: unknown; name?: unknown; arguments?: unknown };
    if (name !== "question_ask" || typeof id !== "string" || failed.has(id) || typeof args !== "object" || args === null) return [];
    const asked = args as { id?: unknown; question?: unknown };
    if (typeof asked.id !== "string" || asked.id.trim() === "" || typeof asked.question !== "string" || asked.question.trim() === "")
      return [];
    return [
      {
        id: `question:${id}`,
        role: "manager",
        text: asked.question.trim(),
        question: { itemId: questionItemId(managerId, asked.id.trim()) },
      },
    ];
  });
}

/**
 * People's messages, the manager's answers, the actions it took and the questions it asked, oldest first. A question is
 * a line of its own, with the Inbox item it waits in, which `managerId` names.
 */
export function chatLines(entries: readonly EntryRecord[], managerId?: string): readonly ChatLine[] {
  const failed = new Set(
    entries.flatMap((entry) => {
      const message = entry.model?.[0];
      return message?.role === "toolResult" && message.isError === true ? [message.toolCallId] : [];
    }),
  );
  return entries.flatMap((entry): ChatLine[] => {
    const message = entry.model?.[0];
    if (message === undefined) return [];
    const id = String(entry.id);
    if (message.role === "user") {
      const text = withoutAttribution(messageText(message));
      const data = AuthoredEntry.is(entry) ? entry.data : undefined;
      return [{ id, role: "person", text, ...(data === undefined ? {} : { author: { ...data.author } }) }];
    }
    if (message.role === "toolResult") return [{ id, role: "action", text: `${message.toolName}: ${resultText(message.content)}` }];
    const text = messageText(message);
    const asked = managerId === undefined ? [] : questionsAsked(message, failed, managerId);
    return [...(text === "" ? [] : [{ id, role: "manager" as const, text }]), ...asked];
  });
}

/** What search reads of one manager: its pages and open tasks. */
export const searchables = (managerId: string, board: Readonly<BoardState>, pages: Readonly<PagesState>): readonly Searchable[] => [
  ...pages.order.flatMap((id) => {
    const page = pages.pages[id];
    return page === undefined ? [] : [{ kind: "page" as const, id, managerId, title: page.title, body: page.body }];
  }),
  ...Object.values(board.tasks)
    .filter(({ archived }) => !archived)
    .map((task) => ({ kind: "task" as const, id: task.id, managerId, title: task.title, body: task.description })),
];
