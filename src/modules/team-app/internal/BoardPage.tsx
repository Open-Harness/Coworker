import { useCallback, useState } from "react";
import { Load, useLoading } from "~/modules/team-core/service.ts";
import type { View } from "../types.ts";
import { useTeamApi } from "./context.ts";
import { BoardScreen } from "./BoardScreen.tsx";

/** How often an open board asks for changes. */
const REFRESH_MS = 3_000;

/** Loads a manager's board and keeps it fresh while it is open. */
export function BoardPage({ workspaceId, managerId }: { readonly workspaceId: string; readonly managerId: string }) {
  const api = useTeamApi();
  const [view, setView] = useState<View>();
  const { loaded } = useLoading(
    useCallback(() => api.board(workspaceId, managerId), [api, workspaceId, managerId]),
    REFRESH_MS,
  );
  return (
    <Load loaded={loaded} failedTitle="The board did not load">
      {(board) => <BoardScreen board={board} workspaceId={workspaceId} {...(view === undefined ? {} : { view })} onView={setView} />}
    </Load>
  );
}
