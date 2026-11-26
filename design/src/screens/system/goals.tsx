'use client';

import {VStack, HStack, StackItem} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Link} from '@astryxdesign/core/Link';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {DOT} from '../../shell';
import type {Manager} from '../../world';
import type {Rag} from './scorecard';

/** `line`: how far it should be by today, in percent. */
function goalRag(pct: number, line = 100): Rag {
  if (pct >= line - 10) {
    return 'green';
  }
  if (pct >= line - 30) {
    return 'amber';
  }
  return 'red';
}

const RAG_PROGRESS: Record<Rag, 'success' | 'warning' | 'error'> = {
  green: 'success',
  amber: 'warning',
  red: 'error',
};

/** One objective, and the manager that carries it. It opens the manager. */
export function GoalRow({m}: {m: Manager}) {
  const rag = goalRag(m.goal.pct, m.goal.line);
  const href = m.id === 'root' ? '#root' : `#m-${m.id}-overview`;
  return (
    <VStack gap={2}>
      <HStack hAlign="between" vAlign="center" gap={3}>
        <StackItem size="fill">
          <Heading level={4} accessibilityLevel={3}>
            <Link href={href} weight="bold">{m.goal.text}</Link>
          </Heading>
        </StackItem>
        <Text type="supporting" color="secondary">
          {m.goal.value}
        </Text>
      </HStack>
      <ProgressBar
        value={m.goal.pct}
        max={100}
        variant={RAG_PROGRESS[rag]}
        label={`${m.name}: ${m.goal.text}`}
        isLabelHidden
      />
      <HStack hAlign="between" vAlign="center" gap={4} wrap="wrap">
        <HStack gap={2} vAlign="center">
          <StatusDot
            variant={DOT[m.state].variant}
            label={DOT[m.state].label}
          />
          <Text type="supporting" color="secondary">
            {m.name}
          </Text>
        </HStack>
        <Text type="supporting" color="secondary">
          {`By now it should be ${m.goal.line ?? 100}%, and is ${m.goal.pct}%`}
        </Text>
      </HStack>
    </VStack>
  );
}
