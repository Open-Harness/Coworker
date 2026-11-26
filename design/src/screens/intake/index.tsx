// astryx-template: incident-console
import { useMemo, useState } from "react";
import { BottomSheet } from "@astryxdesign/core/BottomSheet";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, StackItem, VStack } from "@astryxdesign/core/Layout";
import { PowerSearch, usePowerSearchConfig, type PowerSearchFilter } from "@astryxdesign/core/PowerSearch";
import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { InboxArrowDownIcon, RectangleStackIcon } from "@heroicons/react/24/outline";
import { CAME, FEEDS, feed, kind, KINDS, type Came } from "../../sales";
import { go } from "../../shell";
import { Inspector } from "./inspector";
import { Rows, STATE } from "./rows";
import { styles } from "./styles";

interface Row extends Record<string, unknown> { id: string; title: string; feed: string; kind: string }
const ROWS: Row[] = CAME.map((c) => ({ id: c.id, title: c.title, feed: c.feed, kind: c.kind ?? "none" }));
const fieldDefs = [
  { key: "title", type: "string", label: "Words" },
  { key: "feed", type: "enum", label: "Came from", enumValues: FEEDS.map((f) => ({ value: f.id, label: f.name })) },
  { key: "kind", type: "enum", label: "Kind", enumValues: KINDS.map((k) => ({ value: k.id, label: k.name })) },
] as const;
const BY: Readonly<Record<string, readonly string[]>> = { arrived: ["event"], found: ["search", "waiting"], asked: ["hand"] };
const at = () => CAME.find((c) => location.hash.endsWith(`-${c.id}`))?.id ?? "i1";

/** What came in, what was decided about each, and why. A person's yes or no here is also an example for the kind. */
export default function Intake() {
  const showToast = useToast();
  const [items, setItems] = useState<readonly Came[]>(CAME);
  const [by, setBy] = useState("all");
  const [filters, setFilters] = useState<PowerSearchFilter[]>([]);
  const [selectedId, setSelectedId] = useState(at());
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { config, applyFilters } = usePowerSearchConfig(fieldDefs, "Intake");
  const isNarrow = useMediaQuery("(max-width: 1024px)");
  const size = useResizable({ defaultSize: 400, minSize: 340, maxSize: 520 });
  const visible = useMemo(() => {
    const ids = new Set(applyFilters(filters, ROWS).map((r) => r.id));
    return items.filter((c) => ids.has(c.id) && (by === "all" || BY[by]!.includes(feed(c.feed).by)));
  }, [filters, applyFilters, by, items]);
  const selected = items.find((c) => c.id === selectedId) ?? null;
  const say = (c: Came, right: boolean) => {
    setItems((all) => all.map((x) => (x.id !== c.id ? x : right && c.state === "ask" ? { ...x, state: "took", work: "SALES-34", why: "You said yes" } : right ? x : { ...x, state: c.state === "left" ? "took" : "left", why: "You said no" })));
    showToast({ body: right ? "Kept as a right example." : `Kept as a wrong example${c.kind ? ` of “${kind(c.kind).name}”` : ""}.`, uniqueID: `say-${c.id}` });
  };
  const inspector = selected ? <Inspector item={selected} onSay={(r) => say(selected, r)} {...(isNarrow ? {} : { style: styles.inspector })} /> : null;
  return (
    <Layout height="fill"
      header={
        <LayoutHeader hasDivider>
          <HStack gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill"><Text type="supporting" color="secondary">{`The latest ${CAME.length} of ${FEEDS.reduce((n, f) => n + f.came, 0)} in 7 days`}</Text></StackItem>
            <SegmentedControl label="How it came" value={by} onChange={setBy} size="sm">
              <SegmentedControlItem label="All" value="all" /><SegmentedControlItem label="Arrived" value="arrived" /><SegmentedControlItem label="Found" value="found" /><SegmentedControlItem label="Asked" value="asked" />
            </SegmentedControl>
            <Button label="Triggers" icon={<Icon icon={RectangleStackIcon} size="sm" />} size="sm" onClick={() => go("m-sales-playbook-triggers")} />
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={0}>
          <VStack gap={0} style={styles.contentFill}>
            <HStack style={styles.searchRow}><StackItem size="fill"><PowerSearch config={config} filters={filters} onChange={(f) => setFilters([...f])} placeholder="Search what came in" resultCount={visible.length} /></StackItem></HStack>
            <StackItem size="fill" style={styles.rows}>
              <Rows items={visible} selectedId={isNarrow && !isSheetOpen ? null : selectedId} isNarrow={isNarrow} onSelect={(id) => { setSelectedId(id); if (isNarrow) setIsSheetOpen(true); }} />
            </StackItem>
          </VStack>
          {isNarrow && selected && <BottomSheet isOpen={isSheetOpen} onOpenChange={setIsSheetOpen} label={selected.title} padding={4}>{inspector}</BottomSheet>}
        </LayoutContent>
      }
      end={isNarrow ? undefined : (
        <>
          <ResizeHandle direction="horizontal" hasDivider isAlwaysVisible={false} resizable={size.props} label="Resize details" />
          <LayoutPanel width={size.size} padding={0} role="complementary" label={selected ? STATE[selected.state].label : "Details"}>
            {inspector ?? <EmptyState title="Nothing chosen" description="Choose a line to see what was decided and why." icon={<Icon icon={InboxArrowDownIcon} size="lg" />} isCompact />}
          </LayoutPanel>
        </>
      )}
    />
  );
}
