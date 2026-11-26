// astryx-template: settings
import { useEffect, useState, type ComponentType } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Center } from "@astryxdesign/core/Center";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Button } from "@astryxdesign/core/Button";
import { useToast } from "@astryxdesign/core/Toast";
import { Selector } from "@astryxdesign/core/Selector";
import { Heading, Text } from "@astryxdesign/core/Text";
import { JUNO } from "../../juno/world";
import { go } from "../../shell";
import { ALL, here, PAGES, slug } from "./data";
import { About, Soul, Talking } from "./parts";
import { SetUpSkill } from "./skill";
import { JunoTriggers } from "./triggers";

/** The pages of the second group are files in ./pages, named by their slug; each fills the pane with a table, as Triggers does. */
const PAGES_MADE = import.meta.glob<{ default: ComponentType<{ onDirty: () => void }>; meta?: { save?: boolean; fills?: boolean } }>("./pages/*.tsx", { eager: true });
const DRAWN: Readonly<Record<string, ComponentType<{ onDirty: () => void }>>> = { About, Soul, Talking, Skills: SetUpSkill };

export default function Juno() {
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const [current, setCurrent] = useState(here(location.hash.slice(1)));
  useEffect(() => { const on = () => setCurrent(here(location.hash.slice(1))); addEventListener("hashchange", on); return () => removeEventListener("hashchange", on); }, []);
  const showToast = useToast();
  const [isDirty, setDirty] = useState(false);
  
  const made = PAGES_MADE[`./pages/${slug(current).slice(5)}.tsx`];
  const Part = DRAWN[current] ?? made?.default;
  const isTable = current === "Triggers" || made?.meta?.fills === true;
  const hasSave = ["About", "Soul", "Talking"].includes(current) || made?.meta?.save === true;
  return (
    <Layout
      height="fill"
      contentWidth={1440}
      header={
        <LayoutHeader hasDivider>
          <HStack gap={3} vAlign="center">
            <Avatar name={JUNO.name} size={40} tooltip={false} />
            <StackItem size="fill"><VStack gap={0}><Heading level={1}>{JUNO.name}</Heading><Text type="supporting" color="secondary">{`${JUNO.role} since ${JUNO.since}`}</Text></VStack></StackItem>
            {hasSave && <Button label="Save" variant="primary" isDisabled={!isDirty} onClick={() => { setDirty(false); showToast({ body: "Saved. Juno says so in your chat.", uniqueID: "save" }); }} />}
          </HStack>
        </LayoutHeader>
      }
      start={
        isNarrow ? undefined : (
          <LayoutPanel hasDivider={false} width={220} padding={2}>
            <VStack gap={4}>
              {PAGES.map((g) => (
                <List key={g.title} density="balanced" header={<HStack paddingInline={2}><Text type="supporting" color="secondary" weight="semibold">{g.title}</Text></HStack>}>
                  {g.items.map((i) => <ListItem key={i} label={i} isSelected={i === current} aria-current={i === current ? "page" : undefined} onClick={() => go(slug(i))} />)}
                </List>
              ))}
            </VStack>
          </LayoutPanel>
        )
      }
      content={
        <LayoutContent role="main" padding={isTable ? 0 : 4} isScrollable={!isTable}>
          {isNarrow && <HStack padding={isTable ? 4 : 0} paddingBlockEnd={4}><StackItem size="fill"><Selector label="Page" isLabelHidden value={current} onChange={(v) => go(slug(v))} options={ALL.map((i) => ({ value: i, label: i }))} /></StackItem></HStack>}
          {current === "Triggers" ? <JunoTriggers /> : isTable && Part ? <Part onDirty={() => setDirty(true)} /> : Part ? <VStack gap={4}><Part onDirty={() => setDirty(true)} /></VStack> : <Center axis="both" minHeight={320}><EmptyState title={current} description="Not drawn yet." /></Center>}
        </LayoutContent>
      }
    />
  );
}
