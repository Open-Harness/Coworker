import { createFileRoute } from "@tanstack/react-router";
import { ChatPage } from "~/modules/team-app/service.ts";

function Chat() {
  const { workspaceId, managerId } = Route.useParams();
  return <ChatPage key={managerId} workspaceId={workspaceId} managerId={managerId} />;
}

export const Route = createFileRoute("/_team/ws/$workspaceId/m/$managerId/chat")({ component: Chat });
