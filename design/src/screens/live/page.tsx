import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { List, ListItem } from "@astryxdesign/core/List";
import { Selector } from "@astryxdesign/core/Selector";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { TabList, Tab } from "@astryxdesign/core/TabList";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { PencilIcon } from "@heroicons/react/24/outline";
import { manager } from "../../world";
import { PARTS, ROWS, type Row } from "./data";
import { Spot } from "./edit";
import { TABS } from "../../shell";
import type { Draft } from "./walk";

interface R extends Record<string, unknown> { id: string; t: Row }
const CSS = `.lv-menu { display: none } @container lv (max-width: 560px) { .lv-side { display: none } .lv-menu { display: block } }`;

/** Sales’s Playbook page as the console draws it: the manager’s header and tabs, the parts beside, the triggers. */
export function SalesPage({ d, onChange }: { d: Draft; onChange: (d: Partial<Draft>) => void }) {
  const m = manager("sales");
  const isNarrow = useMediaQuery("(max-width: 700px)");
  const open = (part: Draft["part"]) => onChange({ part });
  const COLS: TableColumn<R>[] = [
    { key: "name", header: "What", width: proportional(3, { minWidth: 100 }), renderCell: ({ t }) => (
      <VStack gap={0}>
        <HStack gap={2} vAlign="center" wrap="wrap"><Text type="label">{t.name}</Text>{t.id === "signs" && d.kept && !d.saved && <Token size="sm" color="blue" label="Changed" />}</HStack>
        <Text type="supporting" color="secondary">{t.does}</Text>
      </VStack>) },
    { key: "when", header: "When", width: pixel(isNarrow ? 118 : 172), renderCell: ({ t }) => (
      <VStack gap={0.5}>
        <span data-spot={t.id === "signs" ? "cell" : undefined}><Text>{t.id === "signs" ? d.when : t.when}</Text></span>
        <Text type="supporting" color="secondary">{t.id === "signs" && d.saved ? "Mondays are back on 4 Jan" : t.by}</Text>
      </VStack>) },
    { key: "do", header: "", width: pixel(isNarrow ? 44 : 52), renderCell: ({ t }) => t.id === "signs"
      ? <HStack hAlign="end"><Spot at="pencil"><IconButton label={`Edit ${t.name}`} size="sm" variant="ghost" icon={<Icon icon={PencilIcon} size="sm" />} onClick={() => onChange({ part: "Triggers", editing: true })} /></Spot></HStack>
      : <HStack hAlign="end"><IconButton label={`Edit ${t.name}`} size="sm" variant="ghost" icon={<Icon icon={PencilIcon} size="sm" />} onClick={() => undefined} /></HStack> },
  ];
  return (
    <VStack style={{ containerType: "inline-size", containerName: "lv", minHeight: "100%" }}>
      <style>{CSS}</style>
      <VStack gap={2} paddingInline={4} paddingBlockStart={4}>
        <HStack gap={3} vAlign="center" wrap="wrap">
          <Heading level={1}>{m.name}</Heading>
          <HStack gap={1.5} vAlign="center"><StatusDot variant="success" label="Working" /><Text type="supporting" color="secondary">{m.now}</Text></HStack>
        </HStack>
        <TabList value="Playbook" onChange={() => undefined} hasDivider isFullBleed>{TABS.map((t) => <Tab key={t} value={t} label={t} />)}</TabList>
      </VStack>
      <HStack gap={0} vAlign="start" style={{ flex: 1 }}>
        <VStack className="lv-side" style={{ width: 220, flexShrink: 0 }} padding={2}>
          <List density="balanced">{PARTS.map((p) => <ListItem key={p} data-spot={p === "Triggers" ? "list" : undefined} label={p} isSelected={p === d.part} aria-current={p === d.part ? "page" : undefined} onClick={() => (p === "Playbook" || p === "Triggers") && open(p)} />)}</List>
        </VStack>
        <StackItem size="fill">
          <VStack gap={4} padding={4} style={{ minWidth: 0 }}>
            <div className="lv-menu"><Selector label="Part" isLabelHidden value={d.part} onChange={(v) => open(String(v) === "Triggers" ? "Triggers" : "Playbook")} options={PARTS.map((n) => ({ value: n, label: n }))} /><Divider /></div>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <StackItem size="fill"><Text type="supporting" color="secondary">{d.saved ? "Version 7, since today. A change reaches open work, and never widens it." : "Version 6, since 23 Nov. A change reaches open work, and never widens it."}</Text></StackItem>
              <Button label="Try on past work" size="sm" variant="secondary" onClick={() => undefined} />
              <Spot at="save"><Button label="Save as version 7" size="sm" variant="primary" isDisabled={!d.kept || d.saved} onClick={() => onChange({ saved: true })} /></Spot>
            </HStack>
            {d.part === "Triggers" ? (
              <VStack gap={3}>
                <Text type="supporting" color="secondary">What makes something come in. The numbers are from the last 7 days.</Text>
                <Table<R> data={ROWS.map((t) => ({ id: t.id, t }))} columns={COLS} idKey="id" dividers="rows" verticalAlign="top" />
              </VStack>
            ) : (
              <VStack gap={2}><Heading level={2}>Sales</Heading><Text type="supporting" color="secondary">Get Acme 12 good calls a week by 31 December, without taking more of Bo’s day. Sales reads all of it, each agent its own step.</Text></VStack>
            )}
          </VStack>
        </StackItem>
      </HStack>
    </VStack>
  );
}
