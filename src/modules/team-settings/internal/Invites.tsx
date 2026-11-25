import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { InviteData, Role } from "../types.ts";
import { DataTable } from "./DataTable.tsx";
import { isRole, roleLabel, ROLES, seconds } from "./words.ts";

type OnInvite = (email: string, role: Role, again: boolean) => Promise<boolean>;

export function InviteForm({ onInvite }: { readonly onInvite: OnInvite }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const isReady = /^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email.trim());
  const send = async () => {
    if (isReady && (await onInvite(email.trim(), role, false))) setEmail("");
  };
  return (
    <Card padding={5}>
      <VStack gap={4}>
        <VStack gap={0}>
          <Heading level={3}>Invite someone</Heading>
          <Text type="supporting">They get an email with a link that works once, for 7 days.</Text>
        </VStack>
        <HStack gap={2} vAlign="end" wrap="wrap">
          <StackItem size="fill">
            <TextInput label="Email" type="email" value={email} onChange={setEmail} onEnter={() => void send()} width="100%" />
          </StackItem>
          <Selector
            label="Preset"
            width={160}
            options={ROLES.map(({ value, label, description }) => ({ value, label, description }))}
            value={role}
            onChange={(value) => isRole(value) && setRole(value)}
          />
          <Button label="Send invite" variant="primary" isDisabled={!isReady} clickAction={send} />
        </HStack>
      </VStack>
    </Card>
  );
}

/** Invites nobody has taken yet. */
export function Invites({
  invites,
  onInvite,
  onCancel,
}: {
  readonly invites: readonly InviteData[];
  readonly onInvite: OnInvite;
  readonly onCancel: (inviteId: string) => Promise<boolean>;
}) {
  return (
    <DataTable
      stacked
      items={invites}
      idOf={({ id }) => id}
      empty="No invites waiting"
      columns={[
        { header: "Invited", cell: ({ email }) => <Text weight="medium">{email}</Text> },
        { header: "Preset", width: 140, cell: ({ role }) => <Text>{roleLabel(role)}</Text> },
        { header: "Expires", width: 160, cell: ({ expiresAt }) => <Timestamp value={seconds(expiresAt)} format="relative" /> },
        {
          header: "",
          width: 200,
          align: "end",
          cell: ({ id, email, role }) => (
            <HStack gap={1} hAlign="end">
              <Button label="Resend" size="sm" variant="ghost" clickAction={async () => void (await onInvite(email, role, true))} />
              <Button label="Revoke" size="sm" variant="ghost" clickAction={async () => void (await onCancel(id))} />
            </HStack>
          ),
        },
      ]}
    />
  );
}
