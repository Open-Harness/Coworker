import { Card } from "@astryxdesign/core/Card";
import { VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Heading, Text } from "@astryxdesign/core/Text";
import type { Found } from "~/modules/views-manager/types.ts";

const minutes = (ms: number): number => Math.round(ms / 60_000);

/** What it found when it read the repo and tried it, before anything is made. */
export function Check({ place, found, who }: { place: string; found: Found; who: string }) {
  const rows: readonly (readonly [string, string])[] = [
    [
      "Repo",
      `${found.repo.name}, ${found.repo.language}, ${found.repo.open} open issues, ${found.repo.merged90} pull requests merged in the last 90 days`,
    ],
    ["How to install", found.install],
    ["How to test", found.test],
    [
      "Time it took",
      `${minutes(found.took.read + found.took.ran)} minutes: ${minutes(found.took.read)} to read the repo, ${minutes(found.took.ran)} to run the tests once in a copy of its own`,
    ],
    [
      "Tried",
      `The tests ran: ${found.ran.passed} passed, ${found.ran.skipped} skipped, ${found.ran.failed === 0 ? "none" : found.ran.failed} failed`,
    ],
    ["It can not", found.cannot.join(". ")],
    ["Not sure of", found.notSure.join(". ")],
  ];
  return (
    <VStack gap={5}>
      <VStack gap={1}>
        <Heading level={2}>What it found</Heading>
        <Text type="supporting" color="secondary">
          It read {place} and tried it in a copy, sending nothing. Nothing is made until you say.
        </Text>
      </VStack>
      <MetadataList columns="single" label={{ position: "start", width: 128 }}>
        {rows.map(([k, v]) => (
          <MetadataListItem key={k} label={k}>
            {v}
          </MetadataListItem>
        ))}
      </MetadataList>
      <Card variant="muted" padding={5}>
        <VStack gap={0.5}>
          <Text type="label">What happens next</Text>
          <Text type="supporting" color="secondary">
            Make it, and the manager starts with {who}’s answers above, and asks for what it can not do. Or open the draft first and comment
            on every line.
          </Text>
        </VStack>
      </Card>
    </VStack>
  );
}
