import { createFileRoute } from "@tanstack/react-router";
import { InvitePage } from "~/modules/team-join/service.ts";

function JoinByInvite() {
  return <InvitePage inviteId={Route.useParams().invitationId} />;
}

export const Route = createFileRoute("/_team/join/invite/$invitationId")({ component: JoinByInvite });
