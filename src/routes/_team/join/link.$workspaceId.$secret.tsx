import { createFileRoute } from "@tanstack/react-router";
import { LinkPage } from "~/modules/team-join/service.ts";

function JoinByLink() {
  const { workspaceId, secret } = Route.useParams();
  return <LinkPage workspaceId={workspaceId} secret={secret} />;
}

export const Route = createFileRoute("/_team/join/link/$workspaceId/$secret")({ component: JoinByLink });
