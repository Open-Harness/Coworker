import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/ws/$workspaceId/m/$managerId/settings/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/ws/$workspaceId/m/$managerId/settings/$section", params: { ...params, section: "sources" } });
  },
});
