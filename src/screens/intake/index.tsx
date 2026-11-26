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
import { Reading, useApi, useBrowser, useClock, useGo, useRefresh } from "~/modules/page/service.ts";
import type { PageProps } from "~/modules/page/types.ts";
import type { IntakeView } from "~/modules/views-manager/types.ts";
import { ManagerFrame } from "../manager-frame/frame.tsx";
import { useZone } from "../manager-frame/words.ts";
import { cameOf, type Came } from "./came.ts";
import { Nothing } from "./empty.tsx";
import { Inspector } from "./inspector.tsx";
import { label, Rows } from "./rows.tsx";

interface Row extends Record<string, unknown> {
  readonly id: string;
  readonly title: string;
  readonly feed: string;
  readonly kind: string;
}
const BY: Readonly<Record<string, readonly Came["by"][]>> = { arrived: ["event"], found: ["cron", "wait"], asked: ["asked"] };
const FILL = { height: "100%", minHeight: 0 } as const;
const SEARCH = { padding: "var(--spacing-3)" } as const;
const ROWS = { overflowY: "auto", minHeight: 0 } as const;
const INSPECTOR = { padding: "var(--spacing-4)", height: "100%", overflowY: "auto" } as const;

/** What came in, what was decided about each, and why. A person's yes or no here is also an example for the kind. */
function Intake({ view, manager }: { readonly view: IntakeView; readonly manager: string }) {
  const showToast = useToast();
  const [api, refresh, { newId }, clock, zone, go] = [useApi(), useRefresh(), useBrowser(), useClock(), useZone(), useGo()];
  const first = (name: string): string => name.split(" ")[0] ?? name;
  const items = useMemo(() => view.rows.map((row) => cameOf(row, view, { clock, zone, first })), [view, clock, zone]);
  const [by, setBy] = useState("all");
  const [filters, setFilters] = useState<PowerSearchFilter[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const rows: Row[] = items.map((one) => ({ id: one.id, title: one.title, feed: one.trigger, kind: one.kind?.id ?? "none" }));
  const fieldDefs = [
    { key: "title", type: "string", label: "Words" },
    {
      key: "feed",
      type: "enum",
      label: "Came from",
      enumValues: view.triggers.map((one) => ({ value: one.trigger.id, label: one.trigger.name })),
    },
    { key: "kind", type: "enum", label: "Kind", enumValues: view.kinds.map((one) => ({ value: one.id, label: one.name })) },
  ] as const;
  const { config, applyFilters } = usePowerSearchConfig(fieldDefs, "Intake");
  const isNarrow = useMediaQuery("(max-width: 1024px)");
  const size = useResizable({ defaultSize: 400, minSize: 340, maxSize: 520 });
  const visible = useMemo(() => {
    const ids = new Set(applyFilters(filters, rows).map((one) => one.id));
    return items.filter((one) => ids.has(one.id) && (by === "all" || BY[by]?.includes(one.by) === true));
  }, [filters, applyFilters, by, items]); // oxlint-disable-line react-hooks/exhaustive-deps
  const selectedId = chosen ?? items.find((one) => one.state === "ask")?.id ?? items[0]?.id ?? null;
  const selected = items.find((one) => one.id === selectedId) ?? null;
  const asker = items.find((one) => one.state === "ask")?.asker ?? null;
  const say = async (one: Came, right: boolean) => {
    const did = await api.write("/do", {
      doing: "intake.correct",
      values: { manager, item: one.id, should: right ? "right" : "wrong" },
      key: newId(),
    });
    if (did._tag !== "Ok") return showToast({ body: `That did not go through. ${did.says}`, uniqueID: `failed-${one.id}` });
    showToast({
      body: right ? "Kept as a right example." : `Kept as a wrong example${one.kind ? ` of “${one.kind.name}”` : ""}.`,
      uniqueID: `say-${one.id}`,
    });
    refresh();
  };
  const inspector = selected ? (
    <Inspector
      item={selected}
      manager={manager}
      zone={zone}
      onSay={(right) => void say(selected, right)}
      {...(isNarrow ? {} : { style: INSPECTOR })}
    />
  ) : null;
  const total = view.triggers.reduce((sum, one) => sum + one.came, 0);
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider>
          <HStack gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <Text type="supporting" color="secondary">{`The latest ${items.length} of ${total} in 7 days`}</Text>
            </StackItem>
            <SegmentedControl label="How it came" value={by} onChange={setBy} size="sm">
              <SegmentedControlItem label="All" value="all" />
              <SegmentedControlItem label="Arrived" value="arrived" />
              <SegmentedControlItem label="Found" value="found" />
              <SegmentedControlItem label="Asked" value="asked" />
            </SegmentedControl>
            <Button
              label="Triggers"
              icon={<Icon icon={RectangleStackIcon} size="sm" />}
              size="sm"
              onClick={() => go(`/m/${manager}/playbook/triggers`)}
            />
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={0}>
          <VStack gap={0} style={FILL}>
            <HStack style={SEARCH}>
              <StackItem size="fill">
                <PowerSearch
                  config={config}
                  filters={filters}
                  onChange={(next) => setFilters([...next])}
                  placeholder="Search what came in"
                  resultCount={visible.length}
                />
              </StackItem>
            </HStack>
            <StackItem size="fill" style={ROWS}>
              <Rows
                items={visible}
                selectedId={isNarrow && !isSheetOpen ? null : selectedId}
                isNarrow={isNarrow}
                zone={zone}
                asker={asker}
                onSelect={(id) => {
                  setChosen(id);
                  if (isNarrow) setIsSheetOpen(true);
                }}
              />
            </StackItem>
          </VStack>
          {isNarrow && selected && (
            <BottomSheet isOpen={isSheetOpen} onOpenChange={setIsSheetOpen} label={selected.title} padding={4}>
              {inspector}
            </BottomSheet>
          )}
        </LayoutContent>
      }
      end={
        isNarrow ? undefined : (
          <>
            <ResizeHandle direction="horizontal" hasDivider isAlwaysVisible={false} resizable={size.props} label="Resize details" />
            <LayoutPanel
              width={size.size}
              padding={0}
              role="complementary"
              label={selected ? label(selected.state, selected.asker) : "Details"}
            >
              {inspector ?? (
                <EmptyState
                  title="Nothing chosen"
                  description="Choose a line to see what was decided and why."
                  icon={<Icon icon={InboxArrowDownIcon} size="lg" />}
                  isCompact
                />
              )}
            </LayoutPanel>
          </>
        )
      }
    />
  );
}

export default function IntakePage({ params }: PageProps) {
  const manager = params["manager"] ?? "";
  return (
    <ManagerFrame id={manager} tab="Intake">
      <Reading
        from="/m/:manager/intake?from&state&before"
        parts={params}
        failed="We could not read what came in"
        gone={{ title: "This manager is not here" }}
      >
        {(view) => (view.rows.length === 0 ? <Nothing view={view} manager={manager} /> : <Intake view={view} manager={manager} />)}
      </Reading>
    </ManagerFrame>
  );
}
