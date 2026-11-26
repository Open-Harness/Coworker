import { createFileRoute } from "@tanstack/react-router";
import { SettingsScreen } from "~/modules/app/service.ts";

function WorkspaceSettings() {
  return <SettingsScreen {...Route.useParams()} />;
}

export const Route = createFileRoute("/_app/_chat/w/$workspaceId/settings")({ component: WorkspaceSettings });
