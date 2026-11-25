import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { Loaded } from "~/modules/team-core/types.ts";
import { PageSection } from "~/modules/ui/service.ts";
import type { HandleData, SignInWay } from "../types.ts";
import { DataTable } from "./DataTable.tsx";
import { HANDLE_KIND, HANDLE_PROOF, handleName } from "./words.ts";

const WAY: Readonly<Record<SignInWay, string>> = { google: "Google", github: "GitHub" };
const looksLikeEmail = (text: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(text);

/** The addresses and accounts managers know a person by, and how to add one. */
export function LinkedAccounts({
  handles,
  offered,
  onConnect,
  onEmail,
}: {
  readonly handles: readonly HandleData[];
  /** The providers this deployment has that are not connected yet. */
  readonly offered: readonly SignInWay[];
  readonly onConnect: (way: SignInWay) => Promise<Loaded<string>>;
  readonly onEmail: (email: string) => Promise<Loaded<true>>;
}) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string>();
  const [failure, setFailure] = useState<string>();
  const address = email.trim();
  const add = async () => {
    const result = await onEmail(address);
    setFailure(result._tag === "Failed" ? result.message : undefined);
    if (result._tag === "Failed") return;
    setSentTo(address);
    setEmail("");
  };
  const connect = async (way: SignInWay) => {
    const result = await onConnect(way);
    setFailure(result._tag === "Failed" ? result.message : undefined);
  };
  return (
    <PageSection title="Linked accounts">
      <VStack gap={4}>
        <Text color="secondary">Managers use these to know that a message or a comment is yours.</Text>
        <DataTable
          stacked
          items={handles}
          idOf={({ kind, id }) => `${kind}:${id}`}
          empty="No accounts yet"
          columns={[
            { header: "Account", width: 140, cell: ({ kind }) => HANDLE_KIND[kind] ?? kind },
            { header: "Known as", cell: handleName },
            { header: "Proof", width: 180, cell: ({ proof }) => HANDLE_PROOF[proof] ?? proof },
          ]}
        />
        <Card padding={5}>
          <VStack gap={4}>
            <HStack gap={2} vAlign="end">
              <StackItem size="fill">
                <TextInput label="Another email address" type="email" value={email} onChange={setEmail} width="100%" />
              </StackItem>
              <Button label="Add email" isDisabled={!looksLikeEmail(address)} clickAction={add} />
            </HStack>
            {sentTo !== undefined && (
              <Banner status="info" title={`We sent a link to ${sentTo}`} description="Opening it adds the address. It lasts an hour." />
            )}
            {offered.length > 0 && (
              <HStack gap={2} wrap="wrap">
                {offered.map((way) => (
                  <Button key={way} label={`Connect ${WAY[way]}`} clickAction={() => connect(way)} />
                ))}
              </HStack>
            )}
            {failure !== undefined && <Banner status="error" title="That did not work" description={failure} />}
          </VStack>
        </Card>
      </VStack>
    </PageSection>
  );
}
