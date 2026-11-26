'use client';

import type {ComponentType, SVGProps} from 'react';
import {HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Icon} from '@astryxdesign/core/Icon';
import {Link} from '@astryxdesign/core/Link';
import {Tooltip} from '@astryxdesign/core/Tooltip';
import {pixel, proportional} from '@astryxdesign/core/Table';
import type {TableColumn} from '@astryxdesign/core/Table';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  HandRaisedIcon,
} from '@heroicons/react/24/outline';
import {money, type Row, type ThreadState} from './rows';

export const STATE_LABEL: Record<ThreadState, string> = {
  working: 'Working',
  'needs-you': 'Waiting for a person',
  done: 'Done',
};

const STATE_ICON: Record<ThreadState, ComponentType<SVGProps<SVGSVGElement>>> = {
  working: ArrowPathIcon,
  'needs-you': HandRaisedIcon,
  done: CheckCircleIcon,
};

const STATE_COLOR = {working: 'success', 'needs-you': 'warning', done: 'secondary'} as const;

/** thread-46 has its own page; the others are not built yet. */
export const threadHref = (id: string): string => (id === 'thread-46' ? '#thread' : '#soon-Thread');
const taskHref = (task: string): string => (task === 'ACME-412' ? '#task' : '#soon-Task');

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** On a phone: the thread, and what it cost. The rest is on the thread. */
export function buildColumns(isNarrow = false): TableColumn<Row>[] {
  const all: TableColumn<Row>[] = [
    {
      key: 'name',
      header: 'Thread',
      width: proportional(1.5, {minWidth: isNarrow ? 160 : 190}),
      sortable: true,
      renderCell: row => (
        <HStack gap={2} vAlign="center">
          <Icon
            icon={row.state ? STATE_ICON[row.state] : ChatBubbleLeftRightIcon}
            size="sm"
            color={row.state ? STATE_COLOR[row.state] : 'accent'}
            label={row.state ? STATE_LABEL[row.state] : 'Conversation'}
          />
          {row.kind === 'thread' ? (
            <Link href={threadHref(row.id)}>{row.name}</Link>
          ) : (
            <Text weight="bold">{row.name}</Text>
          )}
          {row.kind === 'thread' && !isNarrow && (
            <Text type="supporting" color="secondary">
              {row.label}
              
            </Text>
          )}
        </HStack>
      ),
    },
    {
      key: 'task',
      header: 'On',
      width: pixel(84),
      sortable: true,
      renderCell: row =>
        row.task === '' ? null : <Link href={taskHref(row.task)}>{row.task}</Link>,
    },
    {
      key: 'from',
      header: 'Forked from',
      width: proportional(1, {minWidth: 150}),
      sortable: true,
      renderCell: row => (
        <Text color="secondary">
          {row.kind === 'conversation' ? `${plural(row.beneath, 'thread')}, ${money(row.beneathCost)}` : row.from}
        </Text>
      ),
    },
    {
      key: 'knew',
      header: (
        <Tooltip content="Messages in the conversation when it was forked">
          <span>Knew</span>
        </Tooltip>
      ),
      width: pixel(64),
      align: 'end',
      sortable: true,
      renderCell: row => <Text color="secondary">{row.knew == null ? '' : String(row.knew)}</Text>,
    },
    {
      key: 'took',
      header: 'Took',
      width: pixel(108),
      align: 'end',
      renderCell: row => <Text color="secondary">{row.took}</Text>,
    },
    {
      key: 'cost',
      header: 'Cost',
      width: pixel(84),
      align: 'end',
      sortable: true,
      renderCell: row => <Text color="secondary">{money(row.cost)}</Text>,
    },
  ];
  return isNarrow ? all.filter(c => ['name', 'cost'].includes(c.key as string)) : all;
}
