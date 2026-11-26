import { VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";

export const Head = ({ title, about }: { title: string; about: string }) => (
  <VStack gap={0}>
    <Heading level={4} accessibilityLevel={2}>
      {title}
    </Heading>
    <Text type="supporting" color="secondary">
      {about}
    </Text>
  </VStack>
);
