import { Card } from "@astryxdesign/core/Card";
import { VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Heading, Text } from "@astryxdesign/core/Text";
import { FOUND } from "./data";

/** What it found when it read the repo and tried it, before anything is made. */
export function Check({ repo }: { repo: string }) {
  return (
    <VStack gap={5}>
      <VStack gap={1}><Heading level={2}>What it found</Heading><Text type="supporting" color="secondary">It read {repo} and tried it in a copy, sending nothing. Nothing is made until you say.</Text></VStack>
      <MetadataList columns="single" label={{ position: "start", width: 128 }}>
        {FOUND.map(([k, v]) => <MetadataListItem key={k} label={k}>{k === "Repo" ? v.replace("acme/api", repo) : v}</MetadataListItem>)}
      </MetadataList>
      <Card variant="muted" padding={5}>
        <VStack gap={0.5}><Text type="label">What happens next</Text><Text type="supporting" color="secondary">Make it, and the manager starts with Juno’s answers above, and asks for what it can not do. Or open the draft first and comment on every line.</Text></VStack>
      </Card>
    </VStack>
  );
}
