// astryx-template: table-tree
import { useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { Markdown } from "@astryxdesign/core/Markdown";
import { Section } from "@astryxdesign/core/Section";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import type { ThreadsView } from "~/modules/views-manager/types.ts";

const PAGE_TABS = ["What a fork is", "Limits"] as const;
type PageTab = (typeof PAGE_TABS)[number];
const panelId = (tab: PageTab) => `threads-${tab.toLowerCase().replaceAll(" ", "-")}`;
// Inside the TabList so its divider border keeps spanning the whole card.
const TABS = { paddingInline: "4px" } as const;

const FORK = `## What a fork is

A fork starts with a copy of the conversation so far. From then on it is its own agent, with its own memory and limits. When it ends it reports back to what it was forked from, and nothing else goes back.
`;

/** The limits as a table: what the manager allows, and how much. */
const limitsOf = (name: string, limits: ThreadsView["limits"]): string => `## Limits

What ${name} allows its forks.

| | Limit |
| --- | --- |
${limits.map((one) => `| ${one.says} | ${one.is} |`).join("\n")}

A thread that reaches a limit stops and says so to what it was forked from.
`;

/** What a fork is and what it may do, under the tree. */
export function PagesPanel({ name, limits }: { readonly name: string; readonly limits: ThreadsView["limits"] }) {
  const [tab, setTab] = useState<PageTab>("What a fork is");
  return (
    <Card padding={0}>
      <Section variant="transparent" padding={0} paddingBlockStart={1}>
        <TabList value={tab} onChange={(value) => setTab(value as PageTab)} role="tablist" size="sm" hasDivider style={TABS}>
          {PAGE_TABS.map((one) => (
            <Tab key={one} value={one} label={one} panelId={panelId(one)} />
          ))}
        </TabList>
      </Section>
      <Section variant="transparent" padding={6} id={panelId(tab)}>
        <Markdown headingLevelStart={2} contentAlign="center">
          {tab === "Limits" ? limitsOf(name, limits) : FORK}
        </Markdown>
      </Section>
    </Card>
  );
}
