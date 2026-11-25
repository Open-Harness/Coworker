import { useRouter } from "@tanstack/react-router";
import type { ChatRow, WorkspaceRow } from "~/modules/protocol/types.ts";
import type { RowHandlers } from "~/modules/ui/types.ts";
import { useReport } from "./hooks.ts";
import { links } from "./links.ts";
import { useSession } from "./page-context.ts";

/** What the menus of chats and workspaces do. Deleting what is on screen goes home. */
export function useRowHandlers(shown: { readonly workspaceId?: string; readonly chatId?: number }) {
  const { directory } = useSession();
  const report = useReport();
  const router = useRouter();
  const workspaceHandlers = ({ id }: WorkspaceRow): RowHandlers => ({
    onPin: (pinned) => void report(directory.updateWorkspace(id, { pinned })),
    onRename: (title) => void report(directory.updateWorkspace(id, { title })),
    onArchive: (archived) => void report(directory.updateWorkspace(id, { archived })),
    onDelete: () => {
      if (shown.workspaceId === id) router.history.push(links.home);
      void report(directory.deleteWorkspace(id));
    },
  });
  const chatHandlers = (workspace: WorkspaceRow, { id }: ChatRow): RowHandlers => ({
    onPin: (pinned) => void report(directory.updateChat(workspace.id, id, { pinned })),
    onRename: (title) => void report(directory.updateChat(workspace.id, id, { title })),
    onArchive: (archived) => void report(directory.updateChat(workspace.id, id, { archived })),
    onDelete: () => {
      if (shown.workspaceId === workspace.id && shown.chatId === id) router.history.push(links.workspace(workspace.id));
      void report(directory.deleteChat(workspace.id, id));
    },
  });
  return { workspaceHandlers, chatHandlers };
}
