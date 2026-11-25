import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import type { Harness } from "@earendil-works/pi-durable";
import { search } from "~/modules/search/service.ts";
import type { SearchHit } from "~/modules/search/types.ts";
import type { PermissionsView, TaskDetail } from "../types.ts";
import { BoardDoc, type BoardState, type OwnPermissions, PagesDoc } from "./state.ts";
import { TEMPLATES } from "./templates.ts";
import { boardView, runView, searchables } from "./views.ts";
import type { TemplateId } from "../types.ts";

/** One task with what was said on it and done to it, for the Task page. Undefined for one that is not on the board. */
export function taskDetail(board: Readonly<BoardState>, id: string): TaskDetail | undefined {
  const number = /^(?:dt-)?(\d+)$/iu.exec(id.trim())?.[1];
  const record = number === undefined ? undefined : board.tasks[`DT-${number}`];
  const task = boardView(board).tasks.find((candidate) => candidate.id === record?.id);
  if (record === undefined || task === undefined) return undefined;
  return {
    task,
    ...(record.owner === undefined ? {} : { owner: record.owner }),
    comments: (record.comments ?? []).map((comment) => ({ ...comment, by: { ...comment.by } })),
    history: (record.history ?? []).map((entry) => ({ ...entry, by: { ...entry.by } })),
    runs: record.runs.flatMap((runId) => {
      const run = board.runs[runId];
      return run === undefined ? [] : [runView(run)];
    }),
    ...(record.mandate === undefined ? {} : { mandate: { ...record.mandate } }),
  };
}

/** A manager's Permissions and the template's, which "Reset to template" goes back to. */
export function permissionsView(own: Readonly<OwnPermissions>, template: TemplateId): PermissionsView {
  const start = TEMPLATES[template].permissions;
  return {
    template,
    categories: { ...own.categories },
    actions: { ...own.actions },
    templateDefaults: { categories: { ...start.categories }, actions: { ...start.actions } },
  };
}

/** How many runs began from `since` up to `until` (open-ended when omitted). */
export const runsBetween = (board: Readonly<BoardState>, since: number, until?: number): number =>
  Object.values(board.runs).filter(({ startedAt }) => startedAt >= since && (until === undefined || startedAt < until)).length;

/** This manager's pages and open tasks that match, ranked so a workspace can merge every manager's. */
export async function searchManager(harness: Harness, managerId: string, query: string): Promise<readonly SearchHit[]> {
  const [board, pages] = await Promise.all([
    harness.snapshot(BoardDoc, BACKGROUND_CONTEXT),
    harness.snapshot(PagesDoc, BACKGROUND_CONTEXT),
  ]);
  return board === undefined || pages === undefined ? [] : search.find(searchables(managerId, board, pages), query);
}
