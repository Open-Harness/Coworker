// astryx-template: settings
import { useEffect, useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Selector } from "@astryxdesign/core/Selector";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Missing, Reading, useGo } from "~/modules/page/service.ts";
import type { PageProps } from "~/modules/page/types.ts";
import type { CoworkerView } from "~/modules/views-workspace/types.ts";
import { About } from "./about.tsx";
import { History } from "./history.tsx";
import { MayDoPage } from "./may-do.tsx";
import { Memory } from "./memory.tsx";
import { addressOf, ALL, GROUPS, pageAt } from "./pages.ts";
import { Skills } from "./skills.tsx";
import { Soul } from "./soul.tsx";
import { Spending } from "./spending.tsx";
import { Talking } from "./talking.tsx";
import { Triggers } from "./triggers.tsx";
import type { JunoPage, Save } from "./types.ts";
import { useWords } from "./words.ts";

/** The pages that fill the pane with a table of their own, and the pages that are read down the page. */
const FILLS: Readonly<Record<string, (view: CoworkerView) => React.ReactNode>> = {
  Triggers: (view) => <Triggers view={view} />,
  Memory: (view) => <Memory view={view} />,
  History: (view) => <History view={view} />,
};
const FORMS: Readonly<Record<string, (page: JunoPage) => React.ReactNode>> = {
  About: (page) => <About {...page} />,
  Soul: (page) => <Soul {...page} />,
  Talking: (page) => <Talking {...page} />,
  Skills: (page) => <Skills view={page.view} />,
  "May do": (page) => <MayDoPage {...page} />,
  Spending: (page) => <Spending {...page} />,
};
/** Pages that have something to save: the others change by a button of their own. */
const SAVES = new Set(["Soul", "Talking", "May do", "Spending"]);

/** Juno's own pages: who it is, what it keeps, what it may do and what it did. Each is a part of one read, `/coworker`. */
function Juno({ view, current }: { readonly view: CoworkerView; readonly current: string }) {
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const go = useGo();
  const { date } = useWords();
  const [save, setSave] = useState<Save | null>(null);
  // What was edited on one page is not what Save would write on the next.
  useEffect(() => setSave(null), [current]);
  const isTable = current in FILLS;
  const form = FORMS[current];
  return (
    <Layout
      height="fill"
      contentWidth={1440}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={3} vAlign="center">
            <Avatar name={view.identity.name} size={40} tooltip={false} />
            <StackItem size="fill">
              <VStack gap={0}>
                <Heading level={1}>{view.identity.name}</Heading>
                <Text type="supporting" color="secondary">{`${view.identity.role} since ${date(view.identity.since)}`}</Text>
              </VStack>
            </StackItem>
            {SAVES.has(current) && (
              <Button
                label="Save"
                variant="primary"
                isDisabled={save === null}
                onClick={() => void save?.().then((done) => done && setSave(null))}
              />
            )}
          </HStack>
        </LayoutHeader>
      }
      start={
        isNarrow ? undefined : (
          <LayoutPanel hasDivider={false} width={220} padding={2}>
            <VStack gap={4}>
              {GROUPS.map((group) => (
                <List
                  key={group.title}
                  density="balanced"
                  header={
                    <HStack paddingInline={2}>
                      <Text type="supporting" color="secondary" weight="semibold">
                        {group.title}
                      </Text>
                    </HStack>
                  }
                >
                  {group.items.map((page) => (
                    <ListItem
                      key={page}
                      label={page}
                      isSelected={page === current}
                      aria-current={page === current ? "page" : undefined}
                      onClick={() => go(addressOf(page))}
                    />
                  ))}
                </List>
              ))}
            </VStack>
          </LayoutPanel>
        )
      }
      content={
        <LayoutContent role="main" padding={isTable ? 0 : 4} isScrollable={!isTable}>
          {isNarrow && (
            <HStack padding={isTable ? 4 : 0} paddingBlockEnd={4}>
              <StackItem size="fill">
                <Selector
                  label="Page"
                  isLabelHidden
                  value={current}
                  onChange={(page) => page && go(addressOf(page))}
                  options={ALL.map((page) => ({ value: page, label: page }))}
                />
              </StackItem>
            </HStack>
          )}
          {isTable ? FILLS[current]?.(view) : form === undefined ? null : <VStack gap={4}>{form({ view, onDirty: setSave })}</VStack>}
        </LayoutContent>
      }
    />
  );
}

export default function JunoScreen({ params }: PageProps) {
  const current = pageAt(params["page"]);
  if (current === undefined) return <Missing title="This page is not here" description="Juno has no page by that name." />;
  return <Reading from="/coworker">{(view) => <Juno view={view} current={current} />}</Reading>;
}
