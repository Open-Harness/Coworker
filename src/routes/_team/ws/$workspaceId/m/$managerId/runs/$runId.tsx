import { createFileRoute } from "@tanstack/react-router";
import { RunScreen } from "~/modules/team-build/service.ts";

function Run() {
  const { workspaceId, managerId, runId } = Route.useParams();
  return <RunScreen key={runId} workspaceId={workspaceId} managerId={managerId} runId={runId} />;
}

export const Route = createFileRoute("/_team/ws/$workspaceId/m/$managerId/runs/$runId")({ component: Run });
