// astryx-template: table
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { pixel, proportional, Table, useTableSortable, useTableSortableState, type TableColumn } from "@astryxdesign/core/Table";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { useGo } from "~/modules/page/service.ts";
import type { CoworkerView } from "~/modules/views-workspace/types.ts";
import { useDoing } from "./act.ts";
import { AddTrigger } from "./add-trigger.tsx";
import { KIND, triggerWhen, useWords } from "./words.ts";

type Line = CoworkerView["triggers"][number];
interface Row extends Record<string, unknown> {
  id: string;
  name: string;
  when: string;
  by: string;
  of: string;
  manager: string;
  last: string;
  lastState: "done" | "asked" | "failed";
  next: string;
  on: boolean;
}
const DOT = { done: "success", asked: "warning", failed: "error" } as const;
const WORD = { done: "Done", asked: "Asked a person", failed: "Failed" } as const;

/** Every trigger of every manager, in one table. Each is changed in the playbook it belongs to. */
export function Triggers({ view }: { readonly view: CoworkerView }) {
  const [go, act, words] = [useGo(), useDoing(), useWords()];
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const [adding, setAdding] = useState(false);
  const [off, setOff] = useState<ReadonlySet<string>>(new Set());
  const rowOf = ({ trigger, of, next, last }: Line): Row => ({
    id: trigger.id,
    name: trigger.name,
    when: triggerWhen(trigger),
    by: KIND[trigger.by],
    of: words.manager(of),
    manager: of,
    last: last === null ? "" : `${words.clock.short(last.at)}, ${last.says}`,
    lastState: last?.is ?? "done",
    next: next === null ? "" : words.ahead(next),
    on: trigger.on && !off.has(trigger.id),
  });
  const rows = view.triggers.map(rowOf);
  const { sortedData, sortConfig } = useTableSortableState<Row>({
    data: rows,
    comparators: { name: (a, b) => a.name.localeCompare(b.name), of: (a, b) => a.of.localeCompare(b.of) },
  });
  const sortable = useTableSortable<Row>(sortConfig);
  const all: TableColumn<Row>[] = [
    {
      key: "name",
      header: "What",
      width: proportional(1.4, { minWidth: isNarrow ? 150 : 200 }),
      sortable: true,
      renderCell: (r) =>
        isNarrow ? (
          <VStack gap={0}>
            <Text type="body" maxLines={1}>
              {r.name}
            </Text>
            <Text type="supporting" color="secondary" maxLines={1}>
              {r.when}
            </Text>
          </VStack>
        ) : (
          <Text type="body" maxLines={1}>
            {r.name}
          </Text>
        ),
    },
    {
      key: "when",
      header: "When",
      width: proportional(1, { minWidth: 150 }),
      renderCell: (r) => (
        <VStack gap={0}>
          <Text type="body" maxLines={1}>
            {r.when}
          </Text>
          <Text type="supporting" color="secondary">
            {r.by}
          </Text>
        </VStack>
      ),
    },
    {
      key: "of",
      header: "Playbook",
      width: pixel(124),
      sortable: true,
      renderCell: (r) => (
        <Text type="body" color="secondary" maxLines={1}>
          {r.of}
        </Text>
      ),
    },
    {
      key: "last",
      header: "Last time",
      width: proportional(1, { minWidth: 160 }),
      renderCell: (r) => (
        <HStack gap={2} vAlign="center">
          <StatusDot variant={DOT[r.lastState]} label={WORD[r.lastState]} />
          <Text type="body" maxLines={1}>
            {r.last}
          </Text>
        </HStack>
      ),
    },
    {
      key: "next",
      header: "Next",
      width: pixel(128),
      renderCell: (r) => (
        <Text type="supporting" color="secondary">
          {r.on ? r.next : "Off"}
        </Text>
      ),
    },
    {
      key: "on",
      header: "On",
      width: pixel(64),
      renderCell: (r) => (
        <Switch
          label={`${r.name} is on`}
          isLabelHidden
          value={r.on}
          onChange={(on: boolean) => {
            // Turning one off is a doing of its own; turning one on is done in its playbook.
            if (on) return go(`/m/${r.manager}/playbook/triggers`);
            setOff((now) => new Set(now).add(r.id));
            void act("trigger.off", { trigger: r.id }).then(
              (done) => done || setOff((now) => new Set([...now].filter((id) => id !== r.id))),
            );
          }}
        />
      ),
    },
    {
      key: "more",
      header: <VisuallyHidden>Actions</VisuallyHidden>,
      width: pixel(56),
      renderCell: (r) => (
        <DropdownMenu
          hasChevron={false}
          alignment="end"
          button={{
            label: `Actions for ${r.name}`,
            variant: "ghost",
            size: "sm",
            icon: <Icon icon={EllipsisHorizontalIcon} size="sm" />,
            isIconOnly: true,
          }}
          items={[
            { label: "Run it now", onClick: () => void act("trigger.run", { trigger: r.id }) },
            { label: "Change it", onClick: () => go(`/m/${r.manager}/playbook/triggers`) },
          ]}
        />
      ),
    },
  ];
  const columns = isNarrow ? all.filter((c) => ["name", "on", "more"].includes(c.key as string)) : all;
  return (
    <>
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider={false} padding={4}>
          <HStack gap={2} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <Text type="supporting" color="secondary">
                What makes something come in, for all managers. Each is changed in the playbook it belongs to.
              </Text>
            </StackItem>
            <Button label="Add one" size="sm" variant="secondary" onClick={() => setAdding(true)} />
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={0}>
          <Table<Row>
            data={sortedData}
            columns={columns}
            idKey="id"
            density="balanced"
            dividers="rows"
            textOverflow="truncate"
            hasHover
            plugins={{ sortable }}
          />
        </LayoutContent>
      }
    />
      <AddTrigger isOpen={adding} onClose={() => setAdding(false)} />
    </>
  );
}
