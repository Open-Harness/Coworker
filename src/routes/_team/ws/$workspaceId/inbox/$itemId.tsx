import { createFileRoute } from "@tanstack/react-router";
import { NeedsYouPage } from "~/modules/team-app/service.ts";

function NeedsYou() {
  const { workspaceId, itemId } = Route.useParams();
  return <NeedsYouPage workspaceId={workspaceId} itemId={itemId} />;
}

export const Route = createFileRoute("/_team/ws/$workspaceId/inbox/$itemId")({ component: NeedsYou });
