import { useCallback } from "react";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/Layout";
import { teamLinks, useLoading } from "~/modules/team-core/service.ts";
import type { Invite } from "../types.ts";
import { AskButton } from "./AskButton.tsx";
import { Door } from "./Door.tsx";
import { useSession } from "./context.ts";

type Closed = Invite & { readonly status: "used" | "expired" | "withdrawn" };

const titleOf = (invite: Closed): string => {
  if (invite.status === "used") return "This invite has been used";
  return invite.status === "expired" ? "This invite has expired" : "This invite was taken back";
};

const whyOf = (invite: Closed): string => {
  if (invite.status === "used") return `An invite works once. If it was you, sign in with ${invite.email} to open ${invite.workspaceName}.`;
  const ask = `Ask ${invite.invitedBy} for a new one to join ${invite.workspaceName}.`;
  return invite.status === "expired" ? `Invites last 7 days. ${ask}` : ask;
};

/** Someone who is in already is taken to it; someone signed in who is not can ask the Owners. */
function Next({ invite }: { readonly invite: Closed }) {
  const { api, who } = useSession();
  const { loaded: mine } = useLoading(useCallback(() => api.isMember(invite.workspaceId), [api, invite.workspaceId]));
  if (who === undefined) return <Button label="Sign in" variant="primary" size="lg" width="100%" href={teamLinks.home} />;
  if (mine === undefined) return null;
  if (mine._tag === "Loaded" && mine.value)
    return (
      <Button label={`Open ${invite.workspaceName}`} variant="primary" size="lg" width="100%" href={teamLinks.inbox(invite.workspaceId)} />
    );
  return <AskButton address={invite.address} workspaceName={invite.workspaceName} />;
}

/** An invite that no longer lets anyone in, and what to do about it. */
export function ClosedInvite({ invite }: { readonly invite: Invite | undefined }) {
  if (invite === undefined || invite.status === "open")
    return (
      <Door title="No such invite" description="The link is cut short, or the workspace is gone. Open it from the email again.">
        <Button label="Your workspaces" size="lg" width="100%" href={teamLinks.home} />
      </Door>
    );
  const closed: Closed = { ...invite, status: invite.status };
  return (
    <Door title={titleOf(closed)} description={whyOf(closed)}>
      <VStack gap={2}>
        <Next invite={closed} />
      </VStack>
    </Door>
  );
}
