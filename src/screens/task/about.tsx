// astryx-template: work-item-detail
import { Section, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { SECTION_PADDING, SectionHeader } from "./shared.tsx";

export function AboutSection({ about, approach }: { readonly about: string; readonly approach: string }) {
  return (
    <Section padding={SECTION_PADDING}>
      <VStack gap={4}>
        <SectionHeader title="Description" />
        <Text type="body">{about}</Text>
        <VStack gap={2}>
          {/* Sized as a level 4 but announced as a level 3, so the visual scale stays small without skipping a step in the outline. */}
          <Heading level={4} accessibilityLevel={3}>
            Approach
          </Heading>
          <Text type="body">{approach}</Text>
        </VStack>
      </VStack>
    </Section>
  );
}
