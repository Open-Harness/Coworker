import type { ReactNode } from "react";
import { Grid } from "@astryxdesign/core/Grid";
import { VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";

/** One thing to set: what it is on the left, how it is set on the right. The same on every page with a list beside it. */
export function Part({ title, about, more, children }: { title: string; about: string; more?: ReactNode; children: ReactNode }) {
  return (
    <Grid columns={{ minWidth: 300, max: 2 }} gap={10}>
      <VStack gap={1}>
        <Heading level={3} accessibilityLevel={2}>
          {title}
        </Heading>
        <Text type="supporting" color="secondary">
          {about}
        </Text>
        {more}
      </VStack>
      <VStack gap={4}>{children}</VStack>
    </Grid>
  );
}

/** A page part whose content is a table: the words above it, the table the whole width. */
export function Wide({ title, about, children }: { title: string; about: string; children: ReactNode }) {
  return (
    <VStack gap={4}>
      <VStack gap={1}>
        <Heading level={3} accessibilityLevel={2}>
          {title}
        </Heading>
        <Text type="supporting" color="secondary">
          {about}
        </Text>
      </VStack>
      {children}
    </VStack>
  );
}
