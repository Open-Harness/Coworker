// astryx-template: work-item-detail
import { Avatar } from "@astryxdesign/core/Avatar";
import { AvatarGroup } from "@astryxdesign/core/AvatarGroup";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { useClock, useHref } from "~/modules/page/service.ts";
import type { WorkView } from "~/modules/views-manager/types.ts";
import { dayMonth, say, useZone } from "../manager-frame/words.ts";
import type { Fields } from "./header.tsx";
import { PersonRow, SectionHeader } from "./shared.tsx";

export function DetailsPanel({
  view,
  fields,
  told,
}: {
  readonly view: WorkView;
  readonly fields: Fields;
  readonly told: WorkView["told"];
}) {
  const [href, clock, zone] = [useHref(), useClock(), useZone()];
  const { steps, kinds, answerers } = view.options;
  const step = steps.findIndex((one) => one.id === fields.step);
  const dot = step === 0 ? "neutral" : step === steps.length - 1 ? "success" : "accent";
  const cost = say("dollars", view.work.cost);
  return (
    <VStack gap={10}>
      <VStack gap={4}>
        <SectionHeader title="Details" level={3} />
        <MetadataList>
          <MetadataListItem label="Step">
            <HStack gap={2} vAlign="center">
              <StatusDot variant={dot} label={steps[step]?.name ?? fields.step} />
              <Text type="body">{steps[step]?.name ?? fields.step}</Text>
            </HStack>
          </MetadataListItem>
          <MetadataListItem label="Kind">
            <Text type="body">{kinds.find((one) => one.id === fields.kind)?.name ?? fields.kind}</Text>
          </MetadataListItem>
          <MetadataListItem label="Answers for it">
            <PersonRow name={answerers.find((one) => one.id === fields.answers)?.name ?? view.answers.name} />
          </MetadataListItem>
          <MetadataListItem label="Asked by">
            <PersonRow name={view.asked} />
          </MetadataListItem>
          <MetadataListItem label="Started">
            <Text type="body">{`${dayMonth(view.started, zone)}, ${clock.time(view.started)}`}</Text>
          </MetadataListItem>
          <MetadataListItem label="Cost so far">
            <Text type="body">{view.limit === null ? cost : `${cost} of ${say("dollars", view.limit)}`}</Text>
          </MetadataListItem>
          <MetadataListItem label="Attention">
            <Text type="body">{`${view.attention} minutes of people’s time so far`}</Text>
          </MetadataListItem>
        </MetadataList>
      </VStack>
      <VStack gap={4}>
        <SectionHeader title="People told" level={3} />
        <AvatarGroup size="md">
          {told.map((one) => (
            <Avatar key={one.id} name={one.name} />
          ))}
        </AvatarGroup>
      </VStack>
      <VStack gap={4}>
        <SectionHeader title="Linked items" level={3} />
        <VStack gap={1}>
          {view.links.map((one) => (
            <ClickableCard key={one.id} label={`Open ${one.is}: ${one.title}`} href={href(one.link)} padding={3}>
              <VStack gap={0}>
                <Text type="supporting" color="secondary">{`${one.is} · ${one.id}`}</Text>
                <Text type="body" weight="semibold">
                  {one.title}
                </Text>
                <Text type="supporting" color="secondary">
                  {one.says}
                </Text>
              </VStack>
            </ClickableCard>
          ))}
        </VStack>
      </VStack>
    </VStack>
  );
}
