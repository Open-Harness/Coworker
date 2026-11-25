import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { Token } from "@astryxdesign/core/Token";
import { teamLinks } from "~/modules/team-core/service.ts";
import { type HeardRow, ORIGIN, OUTCOMES } from "./heard.ts";
import { seconds } from "./words.ts";

const LABEL = { position: "start", width: 88 } as const;

/** One event: what arrived, what the Gate made of it, then what the manager did. */
export function EventInspector({
  row,
  workspaceId,
  managerId,
}: {
  readonly row: HeardRow;
  readonly workspaceId: string;
  readonly managerId: string;
}) {
  const outcome = OUTCOMES.find(({ value }) => value === row.outcome);
  return (
    <VStack gap={4}>
      <VStack gap={2}>
        {outcome !== undefined && (
          <HStack gap={2} vAlign="center">
            <StatusDot variant={outcome.dot} label={outcome.label} />
            <Text type="supporting">{ORIGIN[row.origin]}</Text>
            <Token size="sm" color={outcome.token} label={outcome.label} />
          </HStack>
        )}
        <Heading level={2}>{row.title}</Heading>
      </VStack>
      {row.task !== undefined && (
        <HStack>
          <Button label={`Open ${row.task}`} size="sm" href={teamLinks.task(workspaceId, managerId, row.task)} />
        </HStack>
      )}
      <Divider />
      <MetadataList columns="single" label={LABEL}>
        <MetadataListItem label="From">{row.from === "" ? "Unknown" : row.from}</MetadataListItem>
        <MetadataListItem label="Arrived">
          <Timestamp value={seconds(row.at)} format="date_time" />
        </MetadataListItem>
      </MetadataList>
      <Divider />
      <VStack gap={2}>
        <Heading level={3}>1 · Gate</Heading>
        <MetadataList columns="single" label={LABEL}>
          <MetadataListItem label="Strength">{row.strength}</MetadataListItem>
          <MetadataListItem label="Result">{row.gate}</MetadataListItem>
        </MetadataList>
      </VStack>
      <VStack gap={2}>
        <Heading level={3}>2 · Manager's decision</Heading>
        <Text color={row.manager === undefined ? "secondary" : "primary"}>{row.manager ?? "It never reached the manager."}</Text>
      </VStack>
    </VStack>
  );
}
