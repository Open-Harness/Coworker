'use client';

import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Divider} from '@astryxdesign/core/Divider';
import {Icon} from '@astryxdesign/core/Icon';
import {Link} from '@astryxdesign/core/Link';
import {
  ArrowPathIcon,
  BanknotesIcon,
  CheckCircleIcon,
  HandRaisedIcon,
} from '@heroicons/react/24/outline';
import {ENDED_7_DAYS, FORKS_COST_7_DAYS} from './data';
import {ALL_ROWS, COUNTS, DEEPEST, money} from './rows';
import {threadHref} from './columns';

const COUNT_ROWS = [
  {icon: ArrowPathIcon, color: 'success', text: `${COUNTS.running} running now`},
  {icon: HandRaisedIcon, color: 'warning', text: `${COUNTS.waiting} waiting for a person`},
  {icon: CheckCircleIcon, color: 'secondary', text: `${ENDED_7_DAYS} ended in 7 days`},
] as const;

/** How many threads there are, the deepest fork, and what forks cost. */
export function AboutPanel() {
  return (
    <VStack gap={6}>
      <VStack gap={3}>
        <Heading level={3} accessibilityLevel={2}>
          Right now
        </Heading>
        <Text color="secondary">
          Every thread is a fork of the conversation or the thread above it.
        </Text>
        <VStack gap={2}>
          {COUNT_ROWS.map(row => (
            <HStack key={row.text} gap={2} vAlign="center">
              <Icon icon={row.icon} size="sm" color={row.color} />
              <Text>{row.text}</Text>
            </HStack>
          ))}
        </VStack>
      </VStack>

      <Divider />

      <VStack gap={3}>
        <Heading level={3} accessibilityLevel={2}>
          The deepest
        </Heading>
        <Link href={threadHref(DEEPEST.id)}>
          {DEEPEST.label}: {DEEPEST.name}
        </Link>
        <Text type="supporting" color="secondary">
          {DEEPEST.depth} forks down, on {DEEPEST.task}
        </Text>
      </VStack>

      <Divider />

      <VStack gap={3}>
        <Heading level={3} accessibilityLevel={2}>
          What forks cost
        </Heading>
        <HStack gap={2} vAlign="center">
          <Icon icon={BanknotesIcon} size="sm" color="secondary" />
          <Text weight="bold">${FORKS_COST_7_DAYS} in 7 days</Text>
        </HStack>
        <Text type="supporting" color="secondary">
          That is all of Coding's spend. The threads shown here came to{' '}
          {money(ALL_SHOWN)}.
        </Text>
      </VStack>
    </VStack>
  );
}

const ALL_SHOWN = ALL_ROWS.reduce((a, r) => a + r.beneathCost, 0);
