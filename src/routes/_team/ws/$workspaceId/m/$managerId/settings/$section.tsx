import { createFileRoute } from "@tanstack/react-router";
import { ManagerSettings } from "~/modules/team-build/service.ts";

function Settings() {
  const { workspaceId, managerId, section } = Route.useParams();
  const { source } = Route.useSearch();
  return <ManagerSettings workspaceId={workspaceId} managerId={managerId} section={section} source={source} />;
}

export const Route = createFileRoute("/_team/ws/$workspaceId/m/$managerId/settings/$section")({
  component: Settings,
  validateSearch: (search: Record<string, unknown>): { source?: string } =>
    typeof search["source"] === "string" ? { source: search["source"] } : {},
});
