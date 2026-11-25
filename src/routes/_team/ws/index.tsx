import { useMemo } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServer } from "~/modules/team-core/service.ts";
import { createShellApi, WorkspacesPage } from "~/modules/team-shell/service.ts";
import { createStartApi, CreateWorkspacePage } from "~/modules/team-start/service.ts";

function Workspaces() {
  const server = useServer();
  const router = useRouter();
  const start = useMemo(() => createStartApi(server), [server]);
  return (
    <WorkspacesPage
      api={useMemo(() => createShellApi(server), [server])}
      empty={<CreateWorkspacePage api={start} hasOthers={false} onGo={(address) => router.history.push(address)} />}
    />
  );
}

export const Route = createFileRoute("/_team/ws/")({ component: Workspaces });
