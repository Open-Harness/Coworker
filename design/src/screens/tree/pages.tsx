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

const panelId = (tab: PageTab) => `root-${tab.toLowerCase().replaceAll(' ', '-')}`;

/**
 * Root's own pages, under the tree.
 *
 * The tabs swap content in place rather than navigating, so they are a real
 * `role="tablist"` and each `Tab` names the panel it controls. `Markdown`
 * takes `headingLevelStart={2}` because the page's h1 is the title up in the
 * header.
 */
export function PagesPanel() {
  const [tab, setTab] = useState<PageTab>('Playbook');
  return (
    <Card padding={0}>
      {/*
        `hasDivider` is a border on the TabList itself, so the inset has to go
        inside it: padding moves the tabs in 4px while the border still runs
        the full width of the card.
      */}
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
        {/* Prose already caps at Markdown's default 680px measure; centring
            it stops that column hugging the left edge of a much wider card. */}
        <Markdown headingLevelStart={2} contentAlign="center">
          {PAGES[tab]}
        </Markdown>
      </Section>
    </Card>
  );
}
