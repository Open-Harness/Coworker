import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { Avatar } from "@astryxdesign/core/Avatar";
import { AvatarGroup } from "@astryxdesign/core/AvatarGroup";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { PEOPLE, TASK } from "../../world";
import { ANSWER_OPTIONS, KIND_OPTIONS, LANE_DOTS, LANE_OPTIONS } from "./data";
import type { Fields } from "./header";
import { PersonRow, SectionHeader } from "./shared";

const TOLD = [PEOPLE["ama"]!, PEOPLE["chidi"]!];
const LINK_HREF = { Issue: "#soon-GitHub", "Pull request": "#soon-GitHub", Mail: "#m-support-connectors-email" } as const;

export function DetailsPanel({ fields }: { fields: Fields }) {
  const lane = LANE_OPTIONS.find((o) => o.value === fields.lane)!;
  const kind = KIND_OPTIONS.find((o) => o.value === fields.kind)!;
  const answers = ANSWER_OPTIONS.find((o) => o.value === fields.answers)!;
  return (
    <VStack gap={10}>
      <VStack gap={4}>
        <SectionHeader title="Details" level={3} />
        <MetadataList>
          <MetadataListItem label="Step">
            <HStack gap={2} vAlign="center">
              <StatusDot variant={LANE_DOTS[lane.value as keyof typeof LANE_DOTS]} label={lane.label} />
              <Text type="body">{lane.label}</Text>
            </HStack>
          </MetadataListItem>
          <MetadataListItem label="Kind"><Text type="body">{kind.label}</Text></MetadataListItem>
          <MetadataListItem label="Answers for it"><PersonRow name={answers.label} /></MetadataListItem>
          <MetadataListItem label="Asked by"><PersonRow name={TASK.asked} /></MetadataListItem>
          <MetadataListItem label="Started"><Text type="body">{TASK.started}</Text></MetadataListItem>
          <MetadataListItem label="Cost so far"><Text type="body">{TASK.cost} of {TASK.limit}</Text></MetadataListItem>
          <MetadataListItem label="Attention"><Text type="body">{TASK.attention}</Text></MetadataListItem>
        </MetadataList>
      </VStack>

      <VStack gap={4}>
        <SectionHeader title="People told" level={3} />
        <AvatarGroup size="md">
          {TOLD.map((p) => <Avatar key={p.id} name={p.name} />)}
        </AvatarGroup>
      </VStack>

      <VStack gap={4}>
        <SectionHeader title="Linked items" level={3} />
        <VStack gap={1}>
          {TASK.links.map((item) => (
            <ClickableCard key={item.id} label={`Open ${item.kind}: ${item.title}`} href={LINK_HREF[item.kind]} padding={3}>
              <VStack gap={0}>
                <Text type="supporting" color="secondary">{item.kind} · {item.id}</Text>
                <Text type="body" weight="semibold">{item.title}</Text>
                <Text type="supporting" color="secondary">{item.state}</Text>
              </VStack>
            </ClickableCard>
          ))}
        </VStack>
      </VStack>
    </VStack>
  );
}
