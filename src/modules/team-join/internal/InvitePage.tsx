import { useCallback, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Text } from "@astryxdesign/core/Text";
import { teamLinks, useLoading, Waiting } from "~/modules/team-core/service.ts";
import type { Invite, InvitePageProps } from "../types.ts";
import { AccountsPage } from "./AccountsPage.tsx";
import { ClosedInvite } from "./ClosedInvite.tsx";
import { Door } from "./Door.tsx";
import { useSession } from "./context.ts";
import { SignInPage } from "./SignInPage.tsx";
import { ROLE } from "./words.ts";

/** Signed in, but not with the address the invite went to. Only that address may accept it. */
function WrongAccount({ invite }: { readonly invite: Invite }) {
  const { who, leave } = useSession();
  return (
    <Door
      title={`This invite is for ${invite.email}`}
      description={`You're signed in as ${who?.email ?? ""}. Sign in with the invited address to join ${invite.workspaceName}.`}
    >
      <VStack gap={2}>
        <Button label="Switch account" variant="primary" size="lg" width="100%" clickAction={leave} />
        <Button label="Your workspaces" variant="ghost" size="lg" width="100%" href={teamLinks.home} />
      </VStack>
    </Door>
  );
}

function Accept({ invite, onJoin }: { readonly invite: Invite; readonly onJoin: () => Promise<string | undefined> }) {
  const { who, leave } = useSession();
  const [failure, setFailure] = useState<string>();
  return (
    <Door
      title={`Join ${invite.workspaceName}`}
      description={`${invite.invitedBy} invited you as ${ROLE[invite.role].label}.`}
      failure={failure === undefined ? undefined : { title: "You could not join", description: failure }}
    >
      <MetadataList columns="single" orientation="vertical">
        <MetadataListItem label="You can">{ROLE[invite.role].can}</MetadataListItem>
        <MetadataListItem label="Workspace">{invite.address}</MetadataListItem>
      </MetadataList>
      <VStack gap={3}>
        <Button
          label={`Join ${invite.workspaceName}`}
          variant="primary"
          size="lg"
          width="100%"
          clickAction={async () => setFailure(await onJoin())}
        />
        <Text type="supporting">
          {`Signed in as ${who?.email ?? ""}. `}
          <Link type="supporting" hasUnderline onClick={() => void leave()}>
            Not you?
          </Link>
        </Text>
      </VStack>
    </Door>
  );
}

/** Where an emailed invite opens, signed in or not. */
export function InvitePage({ inviteId }: InvitePageProps) {
  const { api, who } = useSession();
  const { loaded } = useLoading(useCallback(() => api.invite(inviteId), [api, inviteId]));
  const [joined, setJoined] = useState<string>();
  if (joined !== undefined) return <AccountsPage workspaceId={joined} />;
  if (loaded === undefined) return <Waiting />;
  if (loaded._tag === "Failed") return <ClosedInvite invite={undefined} />;
  const invite = loaded.value;
  if (invite.status !== "open") return <ClosedInvite invite={invite} />;
  if (who === undefined)
    return (
      <SignInPage
        title={`Join ${invite.workspaceName} on Co-worker`}
        description={`${invite.invitedBy} invited you. Use ${invite.email}, the address the invite went to.`}
        email={invite.email}
      />
    );
  if (who.email !== invite.email) return <WrongAccount invite={invite} />;
  const join = async () => {
    const accepted = await api.acceptInvite(inviteId);
    if (accepted._tag === "Failed") return accepted.message;
    setJoined(accepted.value);
    return undefined;
  };
  return <Accept invite={invite} onJoin={join} />;
}
