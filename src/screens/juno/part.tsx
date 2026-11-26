import type { ReactNode } from "react";
import { Grid } from "@astryxdesign/core/Grid";
import { VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";

/** One thing to set: what it is on the left, how it is set on the right. */
export function Part({ title, about, children }: { readonly title: string; readonly about: string; readonly children: ReactNode }) {
  return (
    <Grid columns={{ minWidth: 300, max: 2 }} gap={10}>
      <VStack gap={1}>
        <Heading level={3} accessibilityLevel={2}>
          {title}
        </Heading>
        <Text type="supporting" color="secondary">
          {about}
        </Text>
      </VStack>
      <VStack gap={4}>{children}</VStack>
    </Grid>
  );
}
