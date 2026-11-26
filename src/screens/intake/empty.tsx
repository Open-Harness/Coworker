// astryx-template: empty-state
import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Icon } from "@astryxdesign/core/Icon";
import { Table, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { InboxIcon } from "@heroicons/react/24/outline";
import { useGo } from "~/modules/page/service.ts";
import type { IntakeView } from "~/modules/views-manager/types.ts";

interface Row extends Record<string, unknown> {
  readonly id: string;
}

const lowerFirst = (text: string): string => `${text.slice(0, 1).toLowerCase()}${text.slice(1)}`;

/** Nothing has come in yet: what will be here, and the one thing to do. The table keeps its columns. */
export function Nothing({ view, manager }: { readonly view: IntakeView; readonly manager: string }) {
  const go = useGo();
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const columns: TableColumn<Row>[] = ["What came in", "From", `What ${view.head.name} decided`, "When"].map((header, i) => ({
    key: String(i),
    header,
    width: proportional(1, { minWidth: 120 }),
    renderCell: () => null,
  }));
  const trigger = view.triggers[0]?.trigger;
  const none = (
    <Center axis="both" minHeight={320}>
      <EmptyState
        icon={<Icon icon={InboxIcon} size="lg" />}
        title="Nothing has come in yet"
        description={`When something ${trigger === undefined ? "comes in" : `is ${lowerFirst(trigger.name)}`}, it shows here, with what ${view.head.name} decided about it and why.`}
        actions={<Button label="See what makes it start" variant="secondary" onClick={() => go(`/m/${manager}/playbook/triggers`)} />}
      />
    </Center>
  );
  return (
    <Table<Row>
      data={[]}
      columns={isNarrow ? columns.slice(0, 2) : columns}
      idKey="id"
      density="balanced"
      dividers="rows"
      emptyState={none}
    />
  );
}
