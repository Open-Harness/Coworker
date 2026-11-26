import { createFileRoute } from "@tanstack/react-router";
import { Skills } from "~/modules/team-build/service.ts";

function BuildSkills() {
  const { item } = Route.useSearch();
  return <Skills workspaceId={Route.useParams().workspaceId} itemId={item} />;
}

export const Route = createFileRoute("/_team/ws/$workspaceId/build/skills")({
  component: BuildSkills,
  validateSearch: (search: Record<string, unknown>): { item?: string } =>
    typeof search["item"] === "string" ? { item: search["item"] } : {},
});
