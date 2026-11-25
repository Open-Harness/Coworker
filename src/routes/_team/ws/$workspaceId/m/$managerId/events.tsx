import { createFileRoute } from "@tanstack/react-router";
import { Events } from "~/modules/team-build/service.ts";

function ManagerEvents() {
  const { workspaceId, managerId } = Route.useParams();
  return <Events workspaceId={workspaceId} managerId={managerId} />;
}

export const Route = createFileRoute("/_team/ws/$workspaceId/m/$managerId/events")({ component: ManagerEvents });
