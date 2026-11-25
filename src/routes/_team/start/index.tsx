import { useMemo } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServer } from "~/modules/team-core/service.ts";
import { createStartApi, CreateWorkspacePage } from "~/modules/team-start/service.ts";

function Start() {
  const server = useServer();
  const router = useRouter();
  return (
    <CreateWorkspacePage api={useMemo(() => createStartApi(server), [server])} hasOthers onGo={(address) => router.history.push(address)} />
  );
}

export const Route = createFileRoute("/_team/start/")({ component: Start });
