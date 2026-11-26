import { useMemo, useState } from "react";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { usePowerSearchConfig } from "@astryxdesign/core/PowerSearch";
import type { PowerSearchFilter } from "@astryxdesign/core/PowerSearch";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Table, toSearchFilters, useTableFilterState, useTableFiltering, useTableSortable, useTableSortableState } from "@astryxdesign/core/Table";
import { MagnifyingGlassIcon as SearchIcon } from "@heroicons/react/24/outline";
import { IN_THE_CRM, inScope, money, SCOPES, toRow } from "./data";
import type { Deal, Row, Scope } from "./data";
import { COMPARATORS, SEARCH_FIELDS, makeColumns, useFlushEdges } from "./columns";
import { TotalRow } from "./total";

/** The deals in the CRM, searched and filtered in place, with the value underneath following whatever is left. */
export function DealList({ deals, onOpen }: { deals: Deal[]; onOpen: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const isNarrow = useMediaQuery("(max-width: 760px)", true);
  const rows = useMemo(() => deals.map(toRow), [deals]);
  const columns = useMemo(() => makeColumns(onOpen, isNarrow), [onOpen, isNarrow]);

  const { config, applyFilters } = usePowerSearchConfig(SEARCH_FIELDS, "Deals");
  const { filters: columnFilters, onFilterChange, clearAll } = useTableFilterState();
  const filterPlugin = useTableFiltering<Row>({ filters: columnFilters, onFilterChange, searchConfig: config, variant: "popover" });

  // Three narrowing steps, one pass, one array. Every figure on the page reads the result.
  const visible = useMemo(() => {
    const columnPredicates = toSearchFilters(columnFilters, columns, config) as PowerSearchFilter[];
    const matched = applyFilters(columnPredicates, rows);
    const scoped = matched.filter((d) => inScope(d, scope));
    const term = query.trim().toLowerCase();
    return term === "" ? scoped : scoped.filter((d) => `${d.name} ${d.company} ${d.owner} ${d.work ?? ""}`.toLowerCase().includes(term));
  }, [applyFilters, columnFilters, columns, config, rows, scope, query]);

  const { sortedData, sortConfig } = useTableSortableState<Row>({ data: visible, comparators: COMPARATORS });
  const sortPlugin = useTableSortable<Row>(sortConfig);
  const flushPlugin = useFlushEdges();
  const totalValue = useMemo(() => visible.reduce((sum, d) => sum + d.value, 0), [visible]);
  const activeFilterCount = (query.trim() === "" ? 0 : 1) + Object.keys(columnFilters).length + (scope === "all" ? 0 : 1);
  const clearEverything = () => { setQuery(""); setScope("all"); clearAll(); };

  return (
    <Layout
      height="fill"
      contentWidth={1100}
      content={
        <LayoutContent role="main" padding={0}>
          <VStack padding={4} gap={8}>
            <MetadataList columns="multi" orientation="vertical" label={{ position: "top" }}>
              <MetadataListItem label="Open with Sales">21</MetadataListItem>
              <MetadataListItem label="Good calls this week">9 / 12</MetadataListItem>
              <MetadataListItem label="Waiting on a person">1</MetadataListItem>
            </MetadataList>

            <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
              {isNarrow ? (
                <VStack width="100%">
                  <Selector label="Show" isLabelHidden value={scope} onChange={(v) => setScope((v ?? "all") as Scope)} options={SCOPES} />
                </VStack>
              ) : (
                <SegmentedControl label="Show deals" value={scope} onChange={(v) => setScope(v as Scope)}>
                  {SCOPES.map((s) => <SegmentedControlItem key={s.value} value={s.value} label={s.label} />)}
                </SegmentedControl>
              )}
              <VStack width={isNarrow ? "100%" : 300}>
                <TextInput label="Search deals" isLabelHidden value={query} onChange={setQuery} placeholder="Search…" startIcon={<Icon icon={SearchIcon} size="sm" />} />
              </VStack>
            </HStack>

            <VStack gap={6}>
              {visible.length === 0 ? (
                <EmptyState title="No matching deals" description="No deal here matches the current filters." actions={<Button label="Clear filters" variant="secondary" onClick={clearEverything} />} />
              ) : (
                <VStack gap={4}>
                  <Table<Row> data={sortedData} columns={columns} idKey="id" density="balanced" dividers="none" hasHover textOverflow="truncate" plugins={{ sort: sortPlugin, filter: filterPlugin, flush: flushPlugin }} />
                  <VStack gap={3}>
                    <Divider />
                    <TotalRow label="Deals shown" value={String(visible.length)} />
                    <TotalRow label="Value of these deals" value={money(totalValue)} emphasis="strong" />
                    <Divider />
                  </VStack>
                </VStack>
              )}
              {visible.length > 0 && activeFilterCount > 0 && (
                <Banner
                  status="warning"
                  title="Filtered view: the value above is partial"
                  description={`Showing ${visible.length} of ${rows.length} deals here. The CRM holds ${IN_THE_CRM}.`}
                  endContent={<Button label="Clear all filters" variant="secondary" onClick={clearEverything} />}
                />
              )}
              {activeFilterCount === 0 && <Text type="supporting" color="secondary">{`${rows.length} of ${IN_THE_CRM} deals: the ones that changed most recently.`}</Text>}
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
