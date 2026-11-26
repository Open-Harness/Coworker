import { useState } from "react";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import type { MayDo } from "~/modules/coworker/types.ts";
import { useDoing } from "./act.ts";
import { Part } from "./part.tsx";
import type { JunoPage } from "./types.ts";

type Row = MayDo & Record<string, unknown>;
const OPTIONS = [
  { value: "on", label: "On" },
  { value: "ask", label: "Ask" },
  { value: "off", label: "Off" },
];
/** What a group holds, counted from its own lines. */
const holds = (lines: readonly MayDo[]): string => {
  const count = (is: MayDo["is"]) => lines.filter((one) => one.is === is).length;
  return `${lines.length} ${lines.length === 1 ? "line" : "lines"}: ${count("on")} on, ${count("ask")} ask, ${count("off")} off.`;
};

/** What Juno itself may do, as itself. It may ask for more here, and never gives itself more: a person says yes. */
export function MayDoPage({ view, onDirty }: JunoPage) {
  const act = useDoing();
  const [say, setSay] = useState<Readonly<Record<string, string>>>({});
  const groups = [...new Set(view.may.map((one) => one.group))];
  const cols: TableColumn<Row>[] = [
    {
      key: "what",
      header: "Juno may",
      width: proportional(1.4, { minWidth: 170 }),
      renderCell: (r) => (
        <Text type="body" maxLines={2}>
          {r.label}
        </Text>
      ),
    },
    {
      key: "say",
      header: "Says",
      width: pixel(104),
      renderCell: (r) => (
        <Selector
          label={r.label}
          isLabelHidden
          size="sm"
          value={say[r.doing] ?? r.is}
          options={OPTIONS}
          onChange={(next) => {
            if (!next) return;
            const all = { ...say, [r.doing]: next };
            setSay(all);
            onDirty(async () => {
              const done = await Promise.all(Object.entries(all).map(([doing, permission]) => act("coworker.may", { doing, permission })));
              return done.every(Boolean);
            });
          }}
        />
      ),
    },
    {
      key: "from",
      header: "From",
      width: proportional(1, { minWidth: 120 }),
      renderCell: (r) => (
        <Text type="supporting" color="secondary" maxLines={1}>
          {r.from}
        </Text>
      ),
    },
  ];
  return (
    <>
      {groups.map((group, at) => (
        <VStack key={group} gap={4}>
          {at > 0 && <Divider />}
          <Part title={group} about={holds(view.may.filter((one) => one.group === group))}>
            <Table<Row>
              data={view.may.filter((one) => one.group === group).map((one) => ({ ...one }))}
              columns={cols}
              idKey="doing"
              density="balanced"
              dividers="rows"
            />
            {at === groups.length - 1 && (
              <HStack>
                <Text type="supporting" color="secondary">
                  On: it does it and says so. Ask: it asks you first. Off: it does not. Juno can ask to change a line, in your inbox. It
                  never changes one itself.
                </Text>
              </HStack>
            )}
          </Part>
        </VStack>
      ))}
    </>
  );
}
