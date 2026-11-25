import { createFileRoute } from "@tanstack/react-router";
import { PeoplePage } from "~/modules/team-settings/service.ts";

function People() {
  return <PeoplePage workspaceId={Route.useParams().workspaceId} />;
}

export const Route = createFileRoute("/_team/ws/$workspaceId/people")({ component: People });
