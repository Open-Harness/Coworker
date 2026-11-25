import { createFileRoute } from "@tanstack/react-router";
import { InboxPage } from "~/modules/team-app/service.ts";

function Inbox() {
  return <InboxPage workspaceId={Route.useParams().workspaceId} />;
}

export const Route = createFileRoute("/_team/ws/$workspaceId/inbox/")({ component: Inbox });
