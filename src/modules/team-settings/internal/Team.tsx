import { useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { useNarrow } from "~/modules/team-core/service.ts";
import type { Loaded } from "~/modules/team-core/types.ts";
import type { MemberData, Role } from "../types.ts";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import { DataTable } from "./DataTable.tsx";
import { isRole, ROLES, seconds } from "./words.ts";

/** What one person has of their own over their preset, and where to change it. */
export interface OwnChanges {
  readonly count: number;
  readonly href: string;
}

export interface TeamProps {
  readonly members: readonly MemberData[];
  readonly changesOf?: ((member: MemberData) => OwnChanges | undefined) | undefined;
  readonly onRole: (memberId: string, role: Role) => Promise<boolean>;
  readonly onRemove: (memberId: string) => Promise<Loaded<true>>;
}

const Who = ({ member }: { readonly member: MemberData }) => (
  <HStack gap={3} vAlign="center">
    <Avatar name={member.name} size="md" tooltip={false} />
    <VStack gap={0}>
      <Text weight="medium">{member.name}</Text>
      <Text type="supporting" wordBreak="break-all">
        {member.email}
      </Text>
    </VStack>
  </HStack>
);

function PresetPicker({
  member,
  onRole,
  width,
}: {
  readonly member: MemberData;
  readonly onRole: TeamProps["onRole"];
  readonly width: string | number;
}) {
  return (
    <Selector
      label={`${member.name}'s preset`}
      isLabelHidden
      size="sm"
      width={width}
      options={ROLES.map(({ value, label }) => ({ value, label }))}
      value={member.role}
      changeAction={async (value) => void (isRole(value) && value !== member.role && (await onRole(member.id, value)))}
    />
  );
}

const Own = ({ changes }: { readonly changes: OwnChanges | undefined }) =>
  changes === undefined || changes.count === 0 ? (
    <Text color="secondary">None</Text>
  ) : (
    <Link href={changes.href}>{`${changes.count} ${changes.count === 1 ? "change" : "changes"}`}</Link>
  );

/** The people in the workspace, as a table, or as cards on a phone where a table would cut the preset off. */
export function Team({ members, changesOf = () => undefined, onRole, onRemove }: TeamProps) {
  const [leaving, setLeaving] = useState<MemberData>();
  const isNarrow = useNarrow();
  const menu = (member: MemberData) => (
    <MoreMenu
      label={`More for ${member.name}`}
      size="sm"
      alignment="end"
      items={[{ label: "Remove from workspace", onClick: () => setLeaving(member) }]}
    />
  );
  return (
    <>
      {isNarrow ? (
        <VStack gap={3}>
          {members.length === 0 && <EmptyState title="Nobody yet" isCompact />}
          {members.map((member) => (
            <Card key={member.id} padding={4}>
              <VStack gap={3}>
                <HStack gap={2} vAlign="start">
                  <StackItem size="fill">
                    <Who member={member} />
                  </StackItem>
                  {menu(member)}
                </HStack>
                <PresetPicker member={member} onRole={onRole} width="100%" />
                <HStack gap={2} wrap="wrap">
                  <Text type="supporting">Own changes:</Text>
                  <Own changes={changesOf(member)} />
                </HStack>
              </VStack>
            </Card>
          ))}
        </VStack>
      ) : (
        <DataTable
          items={members}
          idOf={({ id }) => id}
          empty="Nobody yet"
          columns={[
            { header: "Person", cell: (member) => <Who member={member} /> },
            { header: "Preset", width: 180, cell: (member) => <PresetPicker member={member} onRole={onRole} width={140} /> },
            { header: "Own changes", width: 140, cell: (member) => <Own changes={changesOf(member)} /> },
            { header: "Joined", width: 140, cell: ({ joinedAt }) => <Timestamp value={seconds(joinedAt)} format="date" /> },
            { header: "", width: 64, align: "end", cell: menu },
          ]}
        />
      )}
      <ConfirmDialog
        isOpen={leaving !== undefined}
        title={`Remove ${leaving?.name ?? ""}?`}
        description="They lose the workspace at once. Their seat ends at the renewal. What they asked for stays."
        actionLabel="Remove"
        onClose={() => setLeaving(undefined)}
        onConfirm={() => (leaving === undefined ? Promise.resolve<Loaded<true>>({ _tag: "Loaded", value: true }) : onRemove(leaving.id))}
      />
    </>
  );
}
