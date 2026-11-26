// astryx-template: table-tree
import { Divider } from "@astryxdesign/core/Divider";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Heading, Text } from "@astryxdesign/core/Text";
import { ArrowPathIcon, BanknotesIcon, CheckCircleIcon, HandRaisedIcon } from "@heroicons/react/24/outline";
import { useHref } from "~/modules/page/service.ts";
import { money, type Row } from "./model.ts";

interface Counts {
  readonly running: number;
  readonly waiting: number;
  readonly deepest: Row | undefined;
}

/** How many threads there are, the deepest fork, and what forks cost. */
export function AboutPanel(props: {
  readonly manager: string;
  readonly name: string;
  readonly counts: Counts;
  readonly ended7: number;
  readonly cost7: number;
  readonly shownCost: number;
}) {
  const { manager, name, counts, ended7, cost7, shownCost } = props;
  const href = useHref();
  const rows = [
    { icon: ArrowPathIcon, color: "success", text: `${counts.running} running now` },
    { icon: HandRaisedIcon, color: "warning", text: `${counts.waiting} waiting for a person` },
    { icon: CheckCircleIcon, color: "secondary", text: `${ended7} ended in 7 days` },
  ] as const;
  const { deepest } = counts;
  return (
    <VStack gap={6}>
      <VStack gap={3}>
        <Heading level={3} accessibilityLevel={2}>
          Right now
        </Heading>
        <Text color="secondary">Every thread is a fork of the conversation or the thread above it.</Text>
        <VStack gap={2}>
          {rows.map((row) => (
            <HStack key={row.text} gap={2} vAlign="center">
              <Icon icon={row.icon} size="sm" color={row.color} />
              <Text>{row.text}</Text>
            </HStack>
          ))}
        </VStack>
      </VStack>
      {deepest === undefined ? null : (
        <>
          <Divider />
          <VStack gap={3}>
            <Heading level={3} accessibilityLevel={2}>
              The deepest
            </Heading>
            <Link href={href(`/m/${manager}/threads/${deepest.id}`)}>
              {deepest.label}: {deepest.name}
            </Link>
            <Text type="supporting" color="secondary">
              {deepest.depth} forks down, on {deepest.task}
            </Text>
          </VStack>
        </>
      )}
      <Divider />
      <VStack gap={3}>
        <Heading level={3} accessibilityLevel={2}>
          What forks cost
        </Heading>
        <HStack gap={2} vAlign="center">
          <Icon icon={BanknotesIcon} size="sm" color="secondary" />
          <Text weight="bold">${cost7} in 7 days</Text>
        </HStack>
        <Text type="supporting" color="secondary">
          That is all of {name}'s spend. The threads shown here came to {money(shownCost)}.
        </Text>
      </VStack>
    </VStack>
  );
}
