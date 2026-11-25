import type { ChatStatus, WorkspaceRow } from "~/modules/protocol/types.ts";

export type SessionRow = {
  readonly id: string;
  readonly workspaceId: string;
  readonly workspace: string;
  readonly chatId: number;
  readonly title: string;
  readonly agent: string;
  readonly version?: number;
  readonly createdBy: string;
  readonly status: ChatStatus;
  readonly isArchived: boolean;
  readonly updatedAt: number;
};
export interface Filter {
  readonly text: string;
  readonly agent?: string | undefined;
  readonly createdBy?: string | undefined;
  readonly workspace?: string | undefined;
  readonly state?: string | undefined;
}

const ASSISTANT = "Assistant";

/** Newest first. */
export const sessionRows = (workspaces: readonly WorkspaceRow[]): readonly SessionRow[] =>
  workspaces
    .flatMap((workspace) =>
      workspace.chats.map((chat) => ({
        id: `${workspace.id} ${chat.id}`,
        workspaceId: workspace.id,
        workspace: workspace.name,
        chatId: chat.id,
        title: chat.title,
        agent: chat.agent?.name ?? ASSISTANT,
        ...(chat.agent === undefined ? {} : { version: chat.agent.version }),
        createdBy: chat.createdBy,
        status: chat.status,
        isArchived: chat.archivedAt !== undefined || workspace.archivedAt !== undefined,
        updatedAt: chat.updatedAt,
      })),
    )
    .toSorted((left, right) => right.updatedAt - left.updatedAt);

function isInState({ status, isArchived }: SessionRow, state: string | undefined): boolean {
  switch (state) {
    case "Active":
      return !isArchived;
    case "Archived":
      return isArchived;
    case "Answering":
      return status === "working";
    case "Failed":
      return status === "failed";
    default:
      return true;
  }
}

export const filterSessions = (rows: readonly SessionRow[], { text, agent, createdBy, workspace, state }: Filter): readonly SessionRow[] =>
  rows.filter(
    (row) =>
      row.title.toLowerCase().includes(text.trim().toLowerCase()) &&
      (agent === undefined || row.agent === agent) &&
      (createdBy === undefined || row.createdBy === createdBy) &&
      (workspace === undefined || row.workspace === workspace) &&
      isInState(row, state),
  );
