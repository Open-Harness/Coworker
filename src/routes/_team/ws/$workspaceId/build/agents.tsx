import { createFileRoute } from "@tanstack/react-router";
import { Agents } from "~/modules/team-build/service.ts";

function BuildAgents() {
  const { item } = Route.useSearch();
  return <Agents workspaceId={Route.useParams().workspaceId} itemId={item} />;
}

export const Route = createFileRoute("/_team/ws/$workspaceId/build/agents")({
  component: BuildAgents,
  validateSearch: (search: Record<string, unknown>): { item?: string } =>
    typeof search["item"] === "string" ? { item: search["item"] } : {},
});
