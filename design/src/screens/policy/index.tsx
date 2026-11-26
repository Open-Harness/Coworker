// astryx-template: settings
import { useState, type ComponentType } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { go } from "../../shell";
import { Kinds } from "./kinds";
import { Goal } from "./goal";
import { Asking, Mandate, Never, Versions } from "./parts";

const PAGES = { "Objective": Goal, "Mandate": Mandate, "Who may ask": Asking, "Kinds of work": Kinds, "Never": Never, "Versions": Versions } as const;
type Page = keyof typeof PAGES;
const NAMES = Object.keys(PAGES) as Page[];
const slug = (p: string) => `m-sales-policy-${p.toLowerCase().replaceAll(" ", "-")}`;
const at = (): Page => NAMES.find((p) => location.hash.slice(1) === slug(p)) ?? "Kinds of work";

/** What the manager is for and how far it may go, who may ask it, and what it may start by itself. One version for all of it. */
export default function Policy() {
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const [current, setCurrent] = useState<Page>(at());
  const open = (p: Page) => { setCurrent(p); go(slug(p)); };
  const [isDirty, setDirty] = useState(false);
  const showToast = useToast();
  const Part = PAGES[current] as ComponentType<{ onDirty?: () => void }>;
  return (
    <Layout height="fill" contentWidth={1440}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={2} vAlign="center" wrap="wrap">
            <StackItem size="fill"><Text type="supporting" color="secondary">Version 6, since 23 Nov. A change reaches open work, and never widens it.</Text></StackItem>
            <Button label="Change it with Juno" variant="ghost" size="sm" onClick={() => go("setup")} />
            <Button label="Try on past work" variant="secondary" size="sm" onClick={() => go("soon-Try on past work")} />
            <Button label="Save as version 7" variant="primary" size="sm" isDisabled={!isDirty} onClick={() => { setDirty(false); showToast({ body: "Version 7. 4 open pieces of work were told.", uniqueID: "save" }); }} />
          </HStack>
        </LayoutHeader>
      }
      start={isNarrow ? undefined : (
        <LayoutPanel hasDivider={false} width={220} padding={2}>
          <List density="balanced">{NAMES.map((p) => <ListItem key={p} label={p} isSelected={p === current} aria-current={p === current ? "page" : undefined} onClick={() => open(p)} />)}</List>
        </LayoutPanel>
      )}
      content={
        <LayoutContent role="main" padding={4}>
          <VStack gap={4}>
            {isNarrow && <><Selector label="Page" isLabelHidden value={current} onChange={(v) => open(v as Page)} options={NAMES.map((n) => ({ value: n, label: n }))} /><Divider /></>}
            <Part onDirty={() => setDirty(true)} />
          </VStack>
        </LayoutContent>
      }
    />
  );
}
