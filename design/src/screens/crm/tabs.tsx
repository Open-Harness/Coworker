import type { CSSProperties } from "react";
import { HStack, Section, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { ArrowDownLeftIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { entries, money, whenOf } from "./data";
import type { Deal } from "./data";

// Pull the list items' inner padding back so their content lines up with the heading above.
const itemsList: CSSProperties = { marginInline: -8 };

const Amount = ({ children }: { children: string }) => <Text type="body" hasTabularNumbers>{children}</Text>;
const Split = ({ left, right, strong }: { left: string; right: string; strong?: boolean }) => (
  <HStack><StackItem size="fill"><Text type="body">{left}</Text></StackItem><Text type="body" weight={strong ? "bold" : "normal"} hasTabularNumbers>{right}</Text></HStack>
);

export function DetailsTab({ deal }: { deal: Deal }) {
  const plan = deal.seats * deal.perSeat;
  const total = plan + deal.setup;
  return (
    <VStack gap={4}>
      <Section>
        <VStack gap={4}>
          <Heading level={2}>What they would buy</Heading>
          <List density="spacious" style={itemsList}>
            <ListItem
              label="Team plan"
              description={<Text type="supporting" color="secondary">{`${deal.seats} seats, for a year`}</Text>}
              endContent={
                <VStack gap={0} hAlign="end">
                  <Text type="body" weight="bold" maxLines={1} hasTabularNumbers>{money(plan)}</Text>
                  <Text type="supporting" color="secondary" maxLines={1} hasTabularNumbers>{`${money(deal.perSeat)} × ${deal.seats}`}</Text>
                </VStack>
              }
            />
            {deal.setup > 0 && (
              <ListItem
                label="Set-up and training"
                description={<Text type="supporting" color="secondary">Once, at the start</Text>}
                endContent={<Text type="body" weight="bold" maxLines={1} hasTabularNumbers>{money(deal.setup)}</Text>}
              />
            )}
          </List>
        </VStack>
      </Section>
      <Section>
        <VStack gap={4}>
          <Heading level={2}>Value</Heading>
          <MetadataList>
            <MetadataListItem label="Plan"><Split left={`${deal.seats} seats`} right={money(plan)} /></MetadataListItem>
            <MetadataListItem label="Set-up"><Split left={deal.setup > 0 ? "Once, at the start" : "None"} right={money(deal.setup)} /></MetadataListItem>
            <MetadataListItem label="Total"><Split left="" right={money(total)} strong /></MetadataListItem>
          </MetadataList>
          <Divider />
          <MetadataList>
            <MetadataListItem label="Came from"><Amount>{deal.source}</Amount></MetadataListItem>
            <MetadataListItem label="Decision by"><Amount>{deal.closeBy}</Amount></MetadataListItem>
            <MetadataListItem label="Work">{deal.work ? <Amount>{deal.work}</Amount> : <Text type="body" color="secondary">None yet</Text>}</MetadataListItem>
          </MetadataList>
        </VStack>
      </Section>
    </VStack>
  );
}

export function MailTab({ deal }: { deal: Deal }) {
  const mails = entries(deal).filter((e) => e.mail);
  return (
    <Section>
      <VStack gap={4}>
        <Heading level={2}>Mail</Heading>
        {mails.length === 0 ? (
          <EmptyState title="No mail on this deal yet" description="Mail to and from the people on this deal shows here." isCompact />
        ) : (
          <VStack gap={2}>
            {mails.map((m, i) => (
              <Collapsible
                key={m.id}
                defaultIsOpen={i === mails.length - 1}
                trigger={
                  <HStack gap={2} vAlign="center">
                    <Icon icon={m.dir === "in" ? ArrowDownLeftIcon : ArrowUpRightIcon} size="sm" color="secondary" />
                    <Text type="body" weight="semibold" maxLines={1}>{m.mail?.subject ?? ""}</Text>
                    <Text type="supporting" color="secondary" maxLines={1}>{`${m.dir === "in" ? "Received" : `Sent by ${m.who}`}, ${whenOf(m.at)}`}</Text>
                  </HStack>
                }>
                <Text type="body">{m.mail?.body ?? ""}</Text>
              </Collapsible>
            ))}
          </VStack>
        )}
      </VStack>
    </Section>
  );
}
