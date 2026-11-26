// astryx-template: table-collapsible
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import type { ConnectorsView, ShellView } from "~/modules/views-workspace/types.ts";

export type Account = ConnectorsView["accounts"][number] & Record<string, unknown>;
export type Connector = ConnectorsView["connectors"][number];

/** Who holds it: Juno when the workspace does, else the person who lent it. */
export const heldBy = (a: Account, shell: ShellView | undefined): string =>
  "workspace" in a.holder
    ? (shell?.coworker.name ?? "")
    : (shell?.people.find((p) => p.id === (a.holder as { person: string }).person)?.name ?? (a.holder as { person: string }).person);

function Works({ a }: { readonly a: Account }) {
  return (
    <HStack gap={1.5} vAlign="center">
      <StatusDot variant={a.works ? "neutral" : "error"} label={a.says} />
      <Text color={a.works ? "secondary" : "primary"} maxLines={1}>
        {a.says}
      </Text>
    </HStack>
  );
}

export function columns(isNarrow: boolean, held: (a: Account) => string, last: (a: Account) => string): TableColumn<Account>[] {
  const name: TableColumn<Account> = {
    key: "name",
    header: "Account",
    width: proportional(3, { minWidth: 160 }),
    renderCell: (a) => (
      <VStack gap={0}>
        <Text type="label" maxLines={1}>
          {a.name}
        </Text>
        <Text type="supporting" color="secondary" maxLines={isNarrow ? 2 : 1}>
          {isNarrow ? `Held by ${held(a)}. Used by ${a.usedBy.map((u) => u.name).join(", ")}` : a.scope}
        </Text>
      </VStack>
    ),
  };
  const state: TableColumn<Account> = {
    key: "state",
    header: "Works",
    width: isNarrow ? pixel(120) : pixel(170),
    renderCell: (a) => <Works a={a} />,
  };
  if (isNarrow) return [name, state];
  return [
    name,
    { key: "held", header: "Held by", width: pixel(150), renderCell: (a) => <Text maxLines={1}>{held(a)}</Text> },
    {
      key: "used",
      header: "Used by",
      width: proportional(2, { minWidth: 140 }),
      renderCell: (a) => <Text maxLines={2}>{a.usedBy.map((u) => u.name).join(", ")}</Text>,
    },
    state,
    {
      key: "last",
      header: "Last used",
      width: pixel(84),
      align: "end",
      renderCell: (a) => (
        <Text color="secondary" hasTabularNumbers>
          {last(a)}
        </Text>
      ),
    },
  ];
}
