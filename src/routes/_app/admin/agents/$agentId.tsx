import { createFileRoute } from "@tanstack/react-router";
import { AgentScreen } from "~/modules/admin/service.ts";

export const Route = createFileRoute("/_app/admin/agents/$agentId")({
  component: () => {
    const { agentId } = Route.useParams();
    return <AgentScreen key={agentId} agentId={agentId} />;
  },
});
