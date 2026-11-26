'use client';

import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Badge} from '@astryxdesign/core/Badge';
import {Divider} from '@astryxdesign/core/Divider';
import {Icon} from '@astryxdesign/core/Icon';
import {Link} from '@astryxdesign/core/Link';
import {Token} from '@astryxdesign/core/Token';
import {
  BanknotesIcon,
  BeakerIcon,
  EyeIcon,
  PencilSquareIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import {go} from '../../shell';
import {manager, MANAGERS, PEOPLE} from '../../world';
import {SPEND_LIMIT} from './data';
import {formatDay, ALL_ROWS} from './rows';

const root = manager('root');
const CONNECTORS = [...new Set(MANAGERS.flatMap(m => m.connectors))];
const MCP = [...new Set(MANAGERS.flatMap(m => m.mcp))];
const SPENT = MANAGERS.reduce((a, m) => a + m.last7.cost, 0);
const HANDED_OUT = Object.values(SPEND_LIMIT).reduce((a, n) => a + n, 0);
const ANSWERS = [PEOPLE['ama'], PEOPLE['bo'], PEOPLE['chidi']].flatMap(p => (p ? [p] : []));

const MAY_DO = [
  {label: 'Read every board and every number', icon: EyeIcon},
  {label: 'Write notes and what changed', icon: PencilSquareIcon},
  {label: 'Try a new version on past work', icon: BeakerIcon},
];

/** What Juno is, what it has handed out, its versions, and who answers for it. */
export function AboutPanel() {
  return (
    <VStack gap={6}>
      <VStack gap={3}>
        <Heading level={3} accessibilityLevel={2}>
          What Juno is
        </Heading>
        <Text color="secondary">
          {root.job}. It does not do the work itself: it makes the managers
          that do.
        </Text>
        {/*
          Topics are chips you can click, which rules out Badge — its docs
          name clickable badges as an anti-pattern. Token is the chip that
          takes an onClick and paints a hover state to match.
        */}
        <Text type="label" color="secondary">
          Connectors it has handed out
        </Text>
        <HStack gap={1} wrap="wrap">
          {CONNECTORS.map(name => (
            <Token
              key={name}
              size="sm"
              label={name}
              onClick={() => go('soon-Connectors')}
            />
          ))}
        </HStack>
        <Text type="label" color="secondary">
          MCP servers it has handed out
        </Text>
        <HStack gap={1} wrap="wrap">
          {MCP.map(name => (
            <Token
              key={name}
              size="sm"
              label={name}
              onClick={() => go('soon-MCP servers')}
            />
          ))}
        </HStack>
        {/*
          Not a List. ListItem is a row with its own inline padding and hit
          area, so it hangs its text further in than the description, the
          topics and the stats above it — the one thing this column needs is
          a single left edge. An icon beside a Link starts where they start.
        */}
        <Text type="label" color="secondary">
          What it may do on its own
        </Text>
        <VStack gap={2}>
          {MAY_DO.map(item => (
            <HStack key={item.label} gap={2} vAlign="center">
              <Icon icon={item.icon} size="sm" color="secondary" />
              <Text>{item.label}</Text>
            </HStack>
          ))}
        </VStack>
        <VStack gap={2}>
          <HStack gap={2} vAlign="center">
            <Icon icon={BanknotesIcon} size="sm" color="secondary" />
            <Link href="#soon-Spending">${SPENT} spent in 7 days</Link>
          </HStack>
          <HStack gap={2} vAlign="center">
            <Icon icon={BanknotesIcon} size="sm" color="secondary" />
            <Link href="#soon-Spending">${HANDED_OUT} a week handed out</Link>
          </HStack>
        </VStack>
      </VStack>

      <Divider />

      <VStack gap={3}>
        <Heading level={3} accessibilityLevel={2}>
          Versions
        </Heading>
        <HStack gap={2} vAlign="center">
          <Icon icon={TagIcon} size="sm" color="secondary" />
          <Text weight="bold">Version {root.version}</Text>
          <Badge label="Current" variant="neutral" />
        </HStack>
        <Text type="supporting" color="secondary">
          Changed {formatDay(ALL_ROWS[0]?.own.changedAt ?? 0)} · {root.version} versions
        </Text>
        <HStack gap={2} vAlign="center">
          <Icon icon={TagIcon} size="sm" color="secondary" />
          <Link href="#m-support-overview">Version 5 of Support</Link>
          <Token size="sm" color="blue" label="Trying" />
        </HStack>
        <Text type="supporting" color="secondary">
          On 40 past mails, beside version 4
        </Text>
      </VStack>

      <Divider />

      <VStack gap={3}>
        <Heading level={3} accessibilityLevel={2}>
          Who answers for the system
        </Heading>
        {/*
          AvatarGroup overlaps its children by design, which fights a wrapping
          grid — so this is a plain wrapped row of avatars.
        */}
        <HStack gap={1} wrap="wrap">
          {ANSWERS.map(p => (
            <Avatar key={p.id} name={p.name} size={32} />
          ))}
        </HStack>
        <Text type="supporting" color="secondary">
          {ANSWERS.map(p => `${p.name} (${p.role.toLowerCase()})`).join(', ')}
        </Text>
      </VStack>
    </VStack>
  );
}
