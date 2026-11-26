import { createFileRoute } from "@tanstack/react-router";
import { Overview } from "~/modules/team-home/service.ts";

function ManagerOverview() {
  const { workspaceId, managerId } = Route.useParams();
  return <Overview workspaceId={workspaceId} managerId={managerId} />;
}

export const Route = createFileRoute("/_team/ws/$workspaceId/m/$managerId/overview")({ component: ManagerOverview });
