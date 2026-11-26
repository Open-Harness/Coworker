import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Switch } from "@astryxdesign/core/Switch";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import type { JoiningData } from "../types.ts";

function Domains({
  domains,
  onDomains,
}: {
  readonly domains: readonly string[];
  readonly onDomains: (domains: readonly string[]) => Promise<boolean>;
}) {
  const [domain, setDomain] = useState("");
  const add = async () => {
    const name = domain.trim().replace(/^@/u, "").toLowerCase();
    if (name !== "" && (await onDomains([...new Set([...domains, name])]))) setDomain("");
  };
  return (
    <Card padding={5}>
      <VStack gap={4}>
        <VStack gap={0}>
          <Heading level={3}>Approved domains</Heading>
          <Text type="supporting">A new account with a verified address at one of these joins as a Member straight away.</Text>
        </VStack>
        {domains.length === 0 ? (
          <Text color="secondary">None. Everyone needs an invite or the link.</Text>
        ) : (
          <HStack gap={2} wrap="wrap">
            {domains.map((name) => (
              <Token key={name} label={name} onRemove={() => void onDomains(domains.filter((other) => other !== name))} />
            ))}
          </HStack>
        )}
        <HStack gap={2} vAlign="end">
          <StackItem size="fill">
            <TextInput label="Domain" placeholder="acme.com" value={domain} onChange={setDomain} onEnter={() => void add()} width="100%" />
          </StackItem>
          <Button label="Approve" isDisabled={domain.trim() === ""} clickAction={add} />
        </HStack>
      </VStack>
    </Card>
  );
}

/** How people get in without an emailed invite. */
export function Joining({
  joining,
  origin,
  onLinks,
  onDomains,
}: {
  readonly joining: JoiningData;
  readonly origin: string;
  readonly onLinks: (on: boolean) => Promise<boolean>;
  readonly onDomains: (domains: readonly string[]) => Promise<boolean>;
}) {
  return (
    <VStack gap={4}>
      <Card padding={5}>
        <VStack gap={4}>
          <Switch
            label="Invite link"
            description="Anyone with the link joins as a Member. Turning it on again makes a new link, and the old one stops working."
            value={joining.linksOn}
            changeAction={async (on) => void (await onLinks(on))}
            labelPosition="start"
            labelSpacing="spread"
            width="100%"
          />
          {joining.linksOn && joining.linkPath !== undefined && (
            <CodeBlock code={`${origin}${joining.linkPath}`} hasLanguageLabel={false} size="sm" width="100%" isWrapped />
          )}
        </VStack>
      </Card>
      <Domains domains={joining.domains} onDomains={onDomains} />
    </VStack>
  );
}
