import { useMemo } from "react";
import { createFileRoute, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useBrowser, useServer } from "~/modules/team-core/service.ts";
import { createTeamApi, TeamApp } from "~/modules/team-app/service.ts";
import { useLeave, useMe } from "~/modules/team-join/service.ts";
import { createShellApi, TeamShell } from "~/modules/team-shell/service.ts";
import { createStartApi, GettingStarted } from "~/modules/team-start/service.ts";

function Workspace() {
  const { listenKeys } = useBrowser();
  const { workspaceId } = Route.useParams();
  const server = useServer();
  const { name } = useMe();
  const leave = useLeave();
  const router = useRouter();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const start = useMemo(() => createStartApi(server), [server]);
  return (
    <TeamApp dependencies={useMemo(() => ({ api: createTeamApi(server), me: name }), [server, name])}>
      <TeamShell
        api={useMemo(() => createShellApi(server), [server])}
        workspaceId={workspaceId}
        path={path}
        me={name}
        onSignOut={() => void leave()}
        onGo={(address) => router.history.push(address)}
        {...(listenKeys === undefined ? {} : { listenKeys })}
        gettingStarted={<GettingStarted api={start} workspaceId={workspaceId} path={path} />}
      >
        <Outlet />
      </TeamShell>
    </TeamApp>
  );
}

export const Route = createFileRoute("/_team/ws/$workspaceId")({ component: Workspace });
