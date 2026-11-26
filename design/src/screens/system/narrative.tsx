'use client';

import {VStack, HStack, StackItem} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {Icon} from '@astryxdesign/core/Icon';
import {Link} from '@astryxdesign/core/Link';
import {WHAT_CHANGED} from '../../world';

type CalloutStatus = (typeof WHAT_CHANGED)[number]['tone'];

// Each callout is a discrete, independently-removable observation, so Card is
// the right container. Card variants are for categorization, not status — the
// status reads from the leading icon (glyph + semantic color + accessible
// name), never from the card surface.
const CALLOUT_ICON: Record<CalloutStatus, 'success' | 'error' | 'info'> = {
  success: 'success',
  error: 'error',
  info: 'info',
};

const CALLOUT_ICON_COLOR: Record<
  CalloutStatus,
  'secondary' | 'error'
> = {
  success: 'secondary',
  error: 'error',
  info: 'secondary',
};

const CALLOUT_LABEL: Record<CalloutStatus, string> = {
  success: 'Good',
  error: 'Below its aim',
  info: 'Context',
};

function NarrativeCard({callout}: {callout: (typeof WHAT_CHANGED)[number]}) {
  return (
    <Card padding={5}>
      <HStack gap={3} vAlign="start">
        <Icon
          icon={CALLOUT_ICON[callout.tone]}
          color={CALLOUT_ICON_COLOR[callout.tone]}
          size="md"
          label={CALLOUT_LABEL[callout.tone]}
        />
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

/** What Root wrote about the last 7 days, and a way to Root itself. */
export function NarrativeBlock() {
  return (
    <VStack gap={2}>
      {WHAT_CHANGED.map(callout => (
        <NarrativeCard key={callout.title} callout={callout} />
      ))}
      <Link href="#root">All managers</Link>
    </VStack>
  );
}
