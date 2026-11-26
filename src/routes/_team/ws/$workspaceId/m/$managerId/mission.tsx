import { createFileRoute } from "@tanstack/react-router";
import { MissionPage } from "~/modules/team-app/service.ts";

function Mission() {
  const { workspaceId, managerId } = Route.useParams();
  const { page } = Route.useSearch();
  return <MissionPage workspaceId={workspaceId} managerId={managerId} {...(page === undefined ? {} : { pageId: page })} />;
}

export const Route = createFileRoute("/_team/ws/$workspaceId/m/$managerId/mission")({
  component: Mission,
  validateSearch: (search: Record<string, unknown>): { page?: string } =>
    typeof search["page"] === "string" ? { page: search["page"] } : {},
});
