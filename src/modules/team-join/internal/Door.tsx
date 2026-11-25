import type { ReactNode } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { CubeTransparentIcon } from "@heroicons/react/24/outline";

const WIDTH = 440;

/** One card in the middle of the page: everything that happens before someone is in a workspace. */
export function Door({
  title,
  description,
  failure,
  children,
}: {
  readonly title: string;
  readonly description?: string | undefined;
  readonly failure?: { readonly title: string; readonly description?: string | undefined } | undefined;
  readonly children?: ReactNode;
}) {
  return (
    <Center axis="both" minHeight="100dvh" padding={4}>
      <Card width="100%" maxWidth={WIDTH} padding={8}>
        <VStack gap={6}>
          <HStack gap={2} vAlign="center">
            <Icon icon={CubeTransparentIcon} size="md" />
            <Text weight="bold">Co-worker</Text>
          </HStack>
          <VStack gap={1}>
            <Heading level={1}>{title}</Heading>
            {description !== undefined && <Text color="secondary">{description}</Text>}
          </VStack>
          {failure !== undefined && (
            <Banner
              status="error"
              title={failure.title}
              {...(failure.description === undefined ? {} : { description: failure.description })}
            />
          )}
          {children}
        </VStack>
      </Card>
    </Center>
  );
}
