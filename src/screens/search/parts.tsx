// astryx-template: detail-page
import type { CSSProperties } from "react";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, Section, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useClock } from "~/modules/page/service.ts";
import type { TriggerView } from "~/modules/views-manager/types.ts";
import { dayMonth, say, useZone } from "../manager-frame/words.ts";

// List has no prop to line its text up with the heading above.
const ITEMS: CSSProperties = { marginInline: -8 };
const secondary = (text: string) => (
  <Text type="supporting" color="secondary">
    {text}
  </Text>
);

/** When something happened, short: the time today, else the day. */
export function useWhen(): (at: number, withTime?: boolean) => string {
  const [clock, zone] = [useClock(), useZone()];
  return (at, withTime = false) => {
    const day = dayMonth(at, zone) === dayMonth(clock.now(), zone) ? "Today" : dayMonth(at, zone);
    return day === "Today" ? `Today, ${clock.time(at)}` : withTime ? `${day}, ${clock.time(at)}` : day;
  };
}

const WORK = /^[A-Z]+-\d+$/u;

export function Found({ view, manager }: { readonly view: TriggerView; readonly manager: string }) {
  const when = useWhen();
  return (
    <Section>
      <VStack gap={4}>
        <HStack vAlign="center" gap={2}>
          <StackItem size="fill">
            <Heading level={2}>Found in 7 days</Heading>
          </StackItem>
          {secondary(`${view.row.came}, of which ${view.row.took} were taken on`)}
        </HStack>
        <List density="spacious" style={ITEMS}>
          {view.found.map((one) => (
            <ListItem
              key={one.title}
              label={one.title}
              href={WORK.test(one.became) ? `/m/${manager}/work/${one.became}` : `/m/${manager}/intake`}
              description={
                <VStack gap={0}>
                  {secondary(one.says)}
                  {secondary(one.from)}
                </VStack>
              }
              endContent={
                <VStack gap={0} hAlign="end">
                  <Text type="body" weight={one.waits ? "bold" : "normal"} maxLines={1}>
                    {one.became}
                  </Text>
                  <Text type="supporting" color="secondary" maxLines={1}>
                    {when(one.at)}
                  </Text>
                </VStack>
              }
            />
          ))}
        </List>
      </VStack>
    </Section>
  );
}

export function Does({ view }: { readonly view: TriggerView }) {
  const { trigger } = view.row;
  return (
    <>
      <Section>
        <VStack gap={4}>
          <Heading level={2}>What it does each time</Heading>
          <List density="spacious" style={ITEMS}>
            {view.steps.map((one, i) => (
              <ListItem key={one.does} label={`${i + 1}. ${one.does}`} description={one.says} endContent={secondary(one.by)} />
            ))}
          </List>
        </VStack>
      </Section>
      {trigger.by !== "cron" ? null : (
        <Section>
          <VStack gap={4}>
            <Heading level={2}>What it looks for</Heading>
            <Text type="body">{trigger.brief}</Text>
            <Divider />
            <MetadataList>
              <MetadataListItem label="Brings back">{trigger.finds.join(", ")}</MetadataListItem>
              <MetadataListItem label="Same again">{trigger.same.join(", ")}</MetadataListItem>
              <MetadataListItem label="Then">The playbook decides. A trigger never writes to anyone.</MetadataListItem>
            </MetadataList>
          </VStack>
        </Section>
      )}
    </>
  );
}

export function Runs({ view }: { readonly view: TriggerView }) {
  const when = useWhen();
  return (
    <Section>
      <VStack gap={4}>
        <Heading level={2}>Runs</Heading>
        <List density="spacious" style={ITEMS}>
          {view.runs.map((one) => (
            <ListItem
              key={one.at}
              label={when(one.at, true)}
              description={one.says}
              endContent={
                <Text type="body" hasTabularNumbers>
                  {say("dollars", one.cost)}
                </Text>
              }
            />
          ))}
        </List>
      </VStack>
    </Section>
  );
}
