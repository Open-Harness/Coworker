import { createFileRoute } from "@tanstack/react-router";
import { Templates } from "~/modules/team-build/service.ts";

function BuildTemplates() {
  return <Templates workspaceId={Route.useParams().workspaceId} />;
}

export const Route = createFileRoute("/_team/ws/$workspaceId/build/templates")({ component: BuildTemplates });
