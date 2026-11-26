import { Layout, LayoutContent, Stack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Heading, Text } from "@astryxdesign/core/Text";
import type { PageProps } from "../types.ts";

/** A page of settings or lists: a title, then sections. */
export function Page({ title, description, endContent, trail, width = "text", children }: PageProps) {
  const isNarrow = useMediaQuery("(max-width: 768px)");
  return (
    <Layout
      height="fill"
      contentWidth={width === "wide" ? 1200 : 768}
      padding={6}
      content={
        <LayoutContent>
          <VStack gap={8}>
            <Stack direction={isNarrow ? "vertical" : "horizontal"} gap={3} vAlign="center">
              <StackItem size="fill">
                <VStack gap={1}>
                  {trail}
                  <Heading level={1}>{title}</Heading>
                  {description !== undefined && <Text color="secondary">{description}</Text>}
                </VStack>
              </StackItem>
              {endContent !== undefined && <StackItem>{endContent}</StackItem>}
            </Stack>
            {children}
          </VStack>
        </LayoutContent>
      }
    />
  );
}

/** One titled part of a page. */
export function PageSection({ title, children }: Pick<PageProps, "title" | "children">) {
  return (
    <VStack gap={3}>
      <Heading level={2}>{title}</Heading>
      {children}
    </VStack>
  );
}
