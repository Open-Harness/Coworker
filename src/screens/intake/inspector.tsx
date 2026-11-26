// astryx-template: incident-console
import type { CSSProperties } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { CheckIcon, MinusIcon } from "@heroicons/react/24/outline";
import { useGo, useHref } from "~/modules/page/service.ts";
import { capital, dayMonth } from "../manager-frame/words.ts";
import { limitOf, mayOf, type Came, type State } from "./came.ts";
import { label, STATE } from "./rows.tsx";

const SAY: Readonly<Record<State, readonly [string, string]>> = {
  ask: ["Yes, take it on", "No"],
  watch: ["It was right", "It was wrong"],
  took: ["It was right", "Should not have"],
  left: ["It was right", "Should have"],
};
const WIDTH = { position: "start", width: 96 } as const;

export function Inspector(props: {
  readonly item: Came;
  readonly manager: string;
  readonly zone: string;
  readonly onSay: (right: boolean) => void;
  readonly style?: CSSProperties;
}) {
  const { item, manager, zone, onSay, style } = props;
  const [go, href] = [useGo(), useHref()];
  const [yes, no] = SAY[item.state];
  const { mandate } = item;
  const text = label(item.state, item.asker);
  return (
    <VStack gap={4} {...(style ? { style } : {})}>
      <VStack gap={2}>
        <HStack gap={2} vAlign="center">
          <StatusDot variant={STATE[item.state].dot} label={text} />
          <Text type="supporting" color="secondary">
            {item.stamp}
          </Text>
          <Badge variant={item.state === "ask" ? "warning" : "neutral"} label={text} />
          {item.work !== null && <Token size="sm" color="gray" label={item.work} />}
        </HStack>
        <Heading level={2}>{item.title}</Heading>
      </VStack>
      <HStack gap={2}>
        <Button label={yes} size="sm" variant={item.state === "ask" ? "primary" : "secondary"} onClick={() => onSay(true)} />
        <Button label={no} size="sm" variant="secondary" onClick={() => onSay(false)} />
      </HStack>
      <Divider />
      <MetadataList columns="single" label={WIDTH}>
        <MetadataListItem label="Came from">
          <Link href={href(`/m/${manager}/triggers/${item.trigger}`)}>{item.feed}</Link>
        </MetadataListItem>
        <MetadataListItem label="Who">{item.who}</MetadataListItem>
        <MetadataListItem label="Let in">{item.gate}</MetadataListItem>
        {item.kind && (
          <MetadataListItem label="Kind">
            <Link href={href(`/m/${manager}/playbook/workflow`)}>{item.kind.name}</Link>
          </MetadataListItem>
        )}
      </MetadataList>
      {item.judged.length > 0 && (
        <>
          <Divider />
          <VStack gap={2}>
            <Heading level={3}>What it was judged to be</Heading>
            <List density="compact">
              {item.judged.map((one) => (
                <ListItem
                  key={one.name}
                  label={one.name}
                  description={one.why}
                  startContent={<Icon icon={one.is ? CheckIcon : MinusIcon} size="sm" color={one.is ? "primary" : "secondary"} />}
                />
              ))}
            </List>
          </VStack>
        </>
      )}
      {mandate !== null && (
        <>
          <Divider />
          <VStack gap={2}>
            <Heading level={3}>{item.state === "ask" ? "The mandate it would get" : "Its mandate"}</Heading>
            <MetadataList columns="single" label={WIDTH}>
              <MetadataListItem label="Because">
                {mandate.mandate.strength === "asked"
                  ? `${mandate.by} asked, ${dayMonth(mandate.at, zone)}, under version ${mandate.mandate.version}`
                  : mandate.mandate.because.by === "person"
                    ? `${item.asker ?? mandate.by}’s yes, under version ${mandate.mandate.version}`
                    : `${mandate.by}, under version ${mandate.mandate.version}`}
              </MetadataListItem>
              <MetadataListItem label="May">{mayOf(mandate.mandate)}</MetadataListItem>
              <MetadataListItem label="May not">{capital(mandate.never.join(", "))}</MetadataListItem>
              <MetadataListItem label="Until">
                {mandate.mandate.until === undefined ? "No end" : dayMonth(mandate.mandate.until, zone)}
              </MetadataListItem>
              <MetadataListItem label="Limit">{limitOf(mandate)}</MetadataListItem>
            </MetadataList>
          </VStack>
        </>
      )}
      <Divider />
      <VStack gap={2}>
        <Heading level={3}>What happened</Heading>
        <List density="compact">
          {item.line.map((one) => (
            <ListItem
              key={one.did}
              label={one.did}
              description={one.says}
              endContent={
                <Text type="supporting" color="secondary">
                  {one.time}
                </Text>
              }
            />
          ))}
        </List>
      </VStack>
      {item.work && (
        <HStack>
          <Button label={`Open ${item.work}`} size="sm" variant="ghost" onClick={() => go(`/m/${manager}/work/${item.work}`)} />
        </HStack>
      )}
    </VStack>
  );
}
