import { useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { VStack } from "@astryxdesign/core/Layout";
import type { Loaded } from "~/modules/team-core/types.ts";
import { Page } from "~/modules/ui/service.ts";
import type { InviteData, JoiningData, MemberData, Role } from "../types.ts";
import { InviteForm, Invites } from "./Invites.tsx";
import { Joining } from "./Joining.tsx";
import { type OwnChanges, Team } from "./Team.tsx";

export interface MembersScreenProps {
  readonly members: readonly MemberData[];
  readonly invites: readonly InviteData[];
  readonly joining: JoiningData;
  /** The app's own address, so a copied link is whole. */
  readonly origin: string;
  readonly changesOf?: ((member: MemberData) => OwnChanges | undefined) | undefined;
  readonly onInvite: (email: string, role: Role, again: boolean) => Promise<boolean>;
  readonly onCancel: (inviteId: string) => Promise<boolean>;
  readonly onRole: (memberId: string, role: Role) => Promise<boolean>;
  readonly onRemove: (memberId: string) => Promise<Loaded<true>>;
  readonly onLinks: (on: boolean) => Promise<boolean>;
  readonly onDomains: (domains: readonly string[]) => Promise<boolean>;
}

/** Who is in the workspace, who was asked, and how else people get in. */
export function MembersScreen({ members, invites, joining, origin, changesOf, ...on }: MembersScreenProps) {
  const [tab, setTab] = useState("team");
  return (
    <Page
      width="wide"
      title="Members"
      description={`${members.length} ${members.length === 1 ? "person" : "people"} in the workspace. Each one is a seat.`}
    >
      <VStack gap={5}>
        <TabList value={tab} onChange={setTab} hasDivider>
          <Tab value="team" label="Team" endContent={<Badge label={String(members.length)} />} />
          <Tab value="invites" label="Invites" endContent={<Badge label={String(invites.length)} />} />
          <Tab value="joining" label="Links and domains" />
        </TabList>
        {tab === "team" && <Team members={members} changesOf={changesOf} onRole={on.onRole} onRemove={on.onRemove} />}
        {tab === "invites" && (
          <>
            <InviteForm onInvite={on.onInvite} />
            <Invites invites={invites} onInvite={on.onInvite} onCancel={on.onCancel} />
          </>
        )}
        {tab === "joining" && <Joining joining={joining} origin={origin} onLinks={on.onLinks} onDomains={on.onDomains} />}
      </VStack>
    </Page>
  );
}
