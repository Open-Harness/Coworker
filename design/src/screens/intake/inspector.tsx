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
import { feed, kind, type Came } from "../../sales";
import { go } from "../../shell";
import { STATE } from "./rows";

const SAY: Readonly<Record<Came["state"], readonly [string, string]>> = { ask: ["Yes, take it on", "No"], watch: ["It was right", "It was wrong"], took: ["It was right", "Should not have"], left: ["It was right", "Should have"] };

export function Inspector({ item, onSay, style }: { item: Came; onSay: (right: boolean) => void; style?: CSSProperties }) {
  const f = feed(item.feed);
  const [yes, no] = SAY[item.state];
  return (
    <VStack gap={4} {...(style ? { style } : {})}>
      <VStack gap={2}>
        <HStack gap={2} vAlign="center">
          <StatusDot variant={STATE[item.state].dot} label={STATE[item.state].label} />
          <Text type="supporting" color="secondary">{item.at}</Text>
          <Badge variant={item.state === "ask" ? "warning" : "neutral"} label={STATE[item.state].label} />
          {item.work && <Token size="sm" color="gray" label={item.work} />}
        </HStack>
        <Heading level={2}>{item.title}</Heading>
      </VStack>
      <HStack gap={2}>
        <Button label={yes} size="sm" variant={item.state === "ask" ? "primary" : "secondary"} onClick={() => onSay(true)} />
        <Button label={no} size="sm" variant="secondary" onClick={() => onSay(false)} />
      </HStack>
      <Divider />
      <MetadataList columns="single" label={{ position: "start", width: 96 }}>
        <MetadataListItem label="Came from"><Link href={f.by === "search" ? "#m-sales-search" : "#m-sales-playbook-triggers"}>{f.name}</Link></MetadataListItem>
        <MetadataListItem label="Who">{item.who}</MetadataListItem>
        <MetadataListItem label="Let in">{item.gate}</MetadataListItem>
        {item.kind && <MetadataListItem label="Kind"><Link href="#m-sales-playbook-workflow">{kind(item.kind).name}</Link></MetadataListItem>}
      </MetadataList>
      {item.judged.length > 0 && (
        <>
          <Divider />
          <VStack gap={2}>
            <Heading level={3}>What it was judged to be</Heading>
            <List density="compact">
              {item.judged.map(([name, is, why]) => <ListItem key={name} label={name} description={why} startContent={<Icon icon={is ? CheckIcon : MinusIcon} size="sm" color={is ? "primary" : "secondary"} />} />)}
            </List>
          </VStack>
        </>
      )}
      {item.mandate && (
        <>
          <Divider />
          <VStack gap={2}>
            <Heading level={3}>{item.state === "ask" ? "The mandate it would get" : "Its mandate"}</Heading>
            <MetadataList columns="single" label={{ position: "start", width: 96 }}>
              <MetadataListItem label="Because">{item.mandate.because}</MetadataListItem>
              <MetadataListItem label="May">{item.mandate.may}</MetadataListItem>
              <MetadataListItem label="May not">{item.mandate.not}</MetadataListItem>
              <MetadataListItem label="Until">{item.mandate.until}</MetadataListItem>
              <MetadataListItem label="Limit">{item.mandate.limit}</MetadataListItem>
            </MetadataList>
          </VStack>
        </>
      )}
      <Divider />
      <VStack gap={2}>
        <Heading level={3}>What happened</Heading>
        <List density="compact">{item.line.map(([what, detail, at]) => <ListItem key={what} label={what} description={detail} endContent={<Text type="supporting" color="secondary">{at}</Text>} />)}</List>
      </VStack>
      {item.work && <HStack><Button label={`Open ${item.work}`} size="sm" variant="ghost" onClick={() => go("soon-Work")} /></HStack>}
    </VStack>
  );
}
