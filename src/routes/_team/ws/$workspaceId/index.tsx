import { createFileRoute } from "@tanstack/react-router";
import { Home } from "~/modules/team-home/service.ts";

/** Home: what needs the person and how the work is going. An empty workspace shows what to do first, in place. */
function WorkspaceHome() {
  const { workspaceId } = Route.useParams();
  return <Home workspaceId={workspaceId} />;
}

export const Route = createFileRoute("/_team/ws/$workspaceId/")({ component: WorkspaceHome });
