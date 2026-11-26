// astryx-template: dashboard-scorecard
import { VStack, HStack, StackItem } from "@astryxdesign/core/Layout";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { useHref } from "~/modules/page/service.ts";
import type { OverviewView } from "~/modules/views-workspace/types.ts";

type Callout = OverviewView["changed"][number];

// The status reads from the leading icon (glyph, colour and name), never from the card surface.
const ICON = { wrong: "error", better: "success", proposes: "info" } as const;
const ICON_COLOR = { wrong: "error", better: "secondary", proposes: "secondary" } as const;
const LABEL = { wrong: "Below its aim", better: "Good", proposes: "Context" } as const;

function NarrativeCard({ callout }: { readonly callout: Callout }) {
  return (
    <Card padding={5}>
      <HStack gap={3} vAlign="start">
        <Icon icon={ICON[callout.tone]} color={ICON_COLOR[callout.tone]} size="md" label={LABEL[callout.tone]} />
        <StackItem size="fill">
          <VStack gap={1}>
            <Heading level={4} accessibilityLevel={3}>
              {callout.title}
            </Heading>
            <Text type="body" color="secondary">
              {callout.text}
            </Text>
          </VStack>
        </StackItem>
      </HStack>
    </Card>
  );
}

/** What Juno wrote about the last 7 days, and a way to all the managers. */
export function NarrativeBlock({ changed }: { readonly changed: OverviewView["changed"] }) {
  const href = useHref();
  return (
    <VStack gap={2}>
      {changed.map((callout) => (
        <NarrativeCard key={callout.title} callout={callout} />
      ))}
      <Link href={href("/managers")}>All managers</Link>
    </VStack>
  );
}
