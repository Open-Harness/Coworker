import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "~/modules/app/service.ts";

function WorkspaceHome() {
  const { workspaceId } = Route.useParams();
  return <Landing key={workspaceId} workspaceId={workspaceId} />;
}

export const Route = createFileRoute("/_app/_chat/w/$workspaceId/")({ component: WorkspaceHome });
