// astryx-template: table-collapsible
import { useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Table, pixel, proportional, useTableRowExpansion, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { go } from "../../../shell";
import { COUNT, CONNECTORS, type Account, type Connector } from "../parts/accounts";

const Link = ({ a }: { a: Account }) => (
  <HStack gap={1.5} vAlign="center"><StatusDot variant={a.link === "ok" ? "neutral" : "error"} label={a.state} /><Text color={a.link === "ok" ? "secondary" : "primary"} maxLines={1}>{a.state}</Text></HStack>
);

function columns(isNarrow: boolean): TableColumn<Account>[] {
  const name: TableColumn<Account> = {
    key: "name", header: "Account", width: proportional(3, { minWidth: 160 }),
    renderCell: (a) => <VStack gap={0}><Text type="label" maxLines={1}>{a.name}</Text><Text type="supporting" color="secondary" maxLines={isNarrow ? 2 : 1}>{isNarrow ? `Held by ${a.heldBy}. Used by ${a.usedBy.join(", ")}` : a.on}</Text></VStack>,
  };
  const state: TableColumn<Account> = { key: "state", header: "Works", width: isNarrow ? pixel(120) : pixel(170), renderCell: (a) => <Link a={a} /> };
  if (isNarrow) return [name, state];
  return [name,
    { key: "held", header: "Held by", width: pixel(150), renderCell: (a) => <Text maxLines={1}>{a.heldBy}</Text> },
    { key: "used", header: "Used by", width: proportional(2, { minWidth: 140 }), renderCell: (a) => <Text maxLines={2}>{a.usedBy.join(", ")}</Text> },
    state,
    { key: "last", header: "Last used", width: pixel(84), align: "end", renderCell: (a) => <Text color="secondary" hasTabularNumbers>{a.last}</Text> }];
}

/** One connector: its accounts, each opening to what it may do. */
function Group({ c, isNarrow, isOpen, onOpen, expanded, onToggle, onCheck }: {
  c: Connector; isNarrow: boolean; isOpen: boolean; onOpen: (o: boolean) => void; expanded: Set<string>; onToggle: (k: string) => void; onCheck: (a: Account) => void;
}) {
  const expansion = useTableRowExpansion<Account>({
    expandedKeys: expanded, onToggle, getRowKey: (a) => a.id,
    renderExpanded: (a) => (
      <VStack gap={3} padding={3}>
        <VStack gap={1}>
          <Text type="supporting" color="secondary">It may, on its own</Text><Text>{a.may}</Text>
          <Text type="supporting" color="secondary">It asks first</Text><Text>{a.asks}</Text>
        </VStack>
        <HStack gap={2} wrap="wrap">
          <Button label="Check it now" variant="secondary" size="sm" onClick={() => onCheck(a)} />
          {a.link === "offline" ? <Button label="Scan the code" variant="primary" size="sm" onClick={() => go("soon-Scan")} /> : null}
          <Button label="Take it away" variant="ghost" size="sm" onClick={() => go("soon-Take it away")} />
        </HStack>
      </VStack>
    ),
  });
  const bad = c.accounts.filter((a) => a.link === "offline").length;
  return (
    <Card padding={2}>
      <Collapsible isOpen={isOpen} onOpenChange={onOpen} trigger={
        <HStack gap={2} vAlign="center" paddingBlock={2} paddingInline={2}>
          <Text weight="semibold">{c.name}</Text>
          <Badge variant="neutral" label={String(c.accounts.length)} />
          <StackItem size="fill"><Text type="supporting" color="secondary" maxLines={1}>{c.what}</Text></StackItem>
          {bad > 0 ? <Text color="primary" hasTabularNumbers>{bad} offline</Text> : null}
        </HStack>
      }>
        <VStack paddingBlockStart={3}>
          <Table<Account> data={[...c.accounts]} columns={columns(isNarrow)} idKey="id" density="compact" dividers="rows" plugins={{ expansion }} />
        </VStack>
      </Collapsible>
    </Card>
  );
}

/** Every connector of the workspace and its accounts: whose, who uses it, whether it works. */
export default function Connectors() {
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const toast = useToast();
  const ids = CONNECTORS.map((c) => c.id);
  const [open, setOpen] = useState<Set<string>>(() => new Set(ids));
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["wa-1"]));
  const toggleRow = (k: string) => setExpanded((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const all = open.size === ids.length;
  const offline = CONNECTORS.flatMap((c) => c.accounts).filter((a) => a.link === "offline").length;
  return (
    <VStack gap={4}>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <VStack gap={0.5}>
            <Heading level={3} accessibilityLevel={2}>Connectors</Heading>
            <Text type="supporting" color="secondary">{COUNT} accounts on {CONNECTORS.length} connectors. {offline} does not work.</Text>
          </VStack>
        </StackItem>
        <Button label={all ? "Collapse all" : "Expand all"} variant="ghost" onClick={() => setOpen(all ? new Set() : new Set(ids))} />
        <DropdownMenu button={{ label: "Connect something", variant: "secondary" }}
          items={CONNECTORS.map((c) => ({ label: c.name, onClick: () => go(c.id === "github" ? "set-connect-github" : `soon-Connect ${c.name}`) }))} />
      </HStack>
      {CONNECTORS.map((c) => (
        <Group key={c.id} c={c} isNarrow={isNarrow} isOpen={open.has(c.id)} expanded={expanded} onToggle={toggleRow}
          onOpen={(o) => setOpen((s) => { const n = new Set(s); if (o) n.add(c.id); else n.delete(c.id); return n; })}
          onCheck={(a) => toast({ body: a.link === "ok" ? `${a.name} works` : `${a.name} is still offline. A person has to scan the code`, uniqueID: a.id })} />
      ))}
    </VStack>
  );
}
