import { createFileRoute } from "@tanstack/react-router";
import { BoardPage } from "~/modules/team-app/service.ts";

function Board() {
  const { workspaceId, managerId } = Route.useParams();
  return <BoardPage workspaceId={workspaceId} managerId={managerId} />;
}

export const Route = createFileRoute("/_team/ws/$workspaceId/m/$managerId/")({ component: Board });
