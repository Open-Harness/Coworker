import { Store } from "@tanstack/store";
import { connect, openBrowserSocket } from "~/modules/connection/service.ts";
import { createDirectoryClient } from "~/modules/directory-client/service.ts";
import { createWorkspaceClient } from "~/modules/manager-client/service.ts";
import type { WorkspaceClient } from "~/modules/manager-client/types.ts";
import type { Person } from "~/modules/protocol/types.ts";
import type { AppDependencies, Session, Workspaces } from "../types.ts";

type Report = (message: string) => void;

function createWorkspaces(open: (workspaceId: string) => WorkspaceClient): Workspaces {
  const current = new Store<WorkspaceClient | undefined>(undefined);
  const replace = (client: WorkspaceClient | undefined) => {
    current.get()?.close();
    current.setState(() => client);
  };
  return {
    current,
    select: (workspaceId) => {
      const known = current.get();
      if (known?.id === workspaceId) return known;
      const client = open(workspaceId);
      replace(client);
      return client;
    },
    close: () => replace(undefined),
  };
}

/** Connects the page for the signed-in person. The session cookie goes with every socket. */
export function createSession(me: Person, { socketUrl }: AppDependencies, onError: Report): Session {
  const open = (path: string) => (shouldReconnect: (code: number) => boolean) => openBrowserSocket(socketUrl(path), shouldReconnect);
  return {
    me,
    drafts: new Map(),
    directory: createDirectoryClient({ connect, open: open("/api/directory/socket"), onError }),
    workspaces: createWorkspaces((workspaceId) =>
      createWorkspaceClient({ workspaceId, connect, open: open(`/api/workspaces/${workspaceId}/socket`), onError }),
    ),
  };
}

export function closeSession(session: Session): void {
  session.workspaces.close();
  session.directory.close();
}
