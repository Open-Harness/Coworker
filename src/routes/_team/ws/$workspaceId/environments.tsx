import { createFileRoute } from "@tanstack/react-router";
import { EnvironmentsPage } from "~/modules/team-settings/service.ts";

function Environments() {
  return <EnvironmentsPage workspaceId={Route.useParams().workspaceId} />;
}

export const Route = createFileRoute("/_team/ws/$workspaceId/environments")({ component: Environments });
