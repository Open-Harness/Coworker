import { Section, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TASK } from "../../world";
import { SECTION_PADDING, SectionHeader } from "./shared";

export function AboutSection() {
  return (
    <Section padding={SECTION_PADDING}>
      <VStack gap={4}>
        <SectionHeader title="Description" />
        <Text type="body">{TASK.about}</Text>
        <VStack gap={2}>
          {/* Sized as a level 4 but announced as a level 3, so the visual scale
              stays small without skipping a step in the document outline. */}
          <Heading level={4} accessibilityLevel={3}>Approach</Heading>
          <Text type="body">{TASK.approach}</Text>
        </VStack>
      </VStack>
    </Section>
  );
}
