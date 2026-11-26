'use client';

import {useState} from 'react';
import * as stylex from '@stylexjs/stylex';
import {Card} from '@astryxdesign/core/Card';
import {Markdown} from '@astryxdesign/core/Markdown';
import {Section} from '@astryxdesign/core/Section';
import {Tab, TabList} from '@astryxdesign/core/TabList';
import {PAGES, PAGE_TABS, type PageTab} from './data';

const styles = stylex.create({
  // Inside the TabList so its divider border keeps spanning the whole card.
  pageTabs: {
    paddingInline: '4px',
  },
});

const panelId = (tab: PageTab) => `threads-${tab.toLowerCase().replaceAll(' ', '-')}`;

/** What a fork is and what it may do, under the tree. */
export function PagesPanel() {
  const [tab, setTab] = useState<PageTab>('What a fork is');
  return (
    <Card padding={0}>
      <Section variant="transparent" padding={0} paddingBlockStart={1}>
        <TabList
          value={tab}
          onChange={value => setTab(value as PageTab)}
          role="tablist"
          size="sm"
          hasDivider
          xstyle={styles.pageTabs}>
          {PAGE_TABS.map(t => (
            <Tab key={t} value={t} label={t} panelId={panelId(t)} />
          ))}
        </TabList>
      </Section>
      <Section variant="transparent" padding={6} id={panelId(tab)}>
        <Markdown headingLevelStart={2} contentAlign="center">
          {PAGES[tab]}
        </Markdown>
      </Section>
    </Card>
  );
}
