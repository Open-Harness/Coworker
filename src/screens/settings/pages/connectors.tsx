// astryx-template: table-collapsible
import { useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Table, useTableRowExpansion } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Reading, useClock, useGo, useRead } from "~/modules/page/service.ts";
import type { ConnectorsView, ShellView } from "~/modules/views-workspace/types.ts";
import { useDoing, type Pressed } from "../doing.ts";

import { columns, heldBy, type Account, type Connector } from "./connector-columns.tsx";

interface GroupProps {
  readonly c: Connector;
  readonly accounts: readonly Account[];
  readonly isNarrow: boolean;
  readonly isOpen: boolean;
  readonly onOpen: (open: boolean) => void;
  readonly expanded: Set<string>;
  readonly onToggle: (key: string) => void;
  readonly doing: Pressed;
  readonly held: (a: Account) => string;
  readonly last: (a: Account) => string;
}

/** One connector: its accounts, each opening to what it may do. */
function Group({ c, accounts, isNarrow, isOpen, onOpen, expanded, onToggle, doing, held, last }: GroupProps) {
  const expansion = useTableRowExpansion<Account>({
    expandedKeys: expanded,
    onToggle,
    getRowKey: (a) => a.account,
    renderExpanded: (a) => (
      <VStack gap={3} padding={3}>
        <VStack gap={1}>
          <Text type="supporting" color="secondary">
            It may, on its own
          </Text>
          <Text>{a.may}</Text>
          <Text type="supporting" color="secondary">
            It asks first
          </Text>
          <Text>{a.asks}</Text>
        </VStack>
        <HStack gap={2} wrap="wrap">
          <Button
            label="Check it now"
            variant="secondary"
            size="sm"
            onClick={() => void doing("connector.check", { account: a.account }, ["/settings/connectors"])}
          />
          {a.works ? null : (
            <Button
              label="Scan the code"
              variant="primary"
              size="sm"
              onClick={() => void doing("connector.scan", { account: a.account }, ["/settings/connectors"])}
            />
          )}
          <Button
            label="Take it away"
            variant="ghost"
            size="sm"
            onClick={() => void doing("connector.take_away", { account: a.account }, ["/settings/connectors"])}
          />
        </HStack>
      </VStack>
    ),
  });
  const bad = accounts.filter((a) => !a.works).length;
  return (
    <Card padding={2}>
      <Collapsible
        isOpen={isOpen}
        onOpenChange={onOpen}
        trigger={
          <HStack gap={2} vAlign="center" paddingBlock={2} paddingInline={2}>
            <Text weight="semibold">{c.name}</Text>
            <Badge variant="neutral" label={String(accounts.length)} />
            <StackItem size="fill">
              <Text type="supporting" color="secondary" maxLines={1}>
                {c.what}
              </Text>
            </StackItem>
            {bad > 0 ? (
              <Text color="primary" hasTabularNumbers>
                {bad} offline
              </Text>
            ) : null}
          </HStack>
        }
      >
        <VStack paddingBlockStart={3}>
          <Table<Account>
            data={[...accounts]}
            columns={columns(isNarrow, held, last)}
            idKey="account"
            density="compact"
            dividers="rows"
            plugins={{ expansion }}
          />
        </VStack>
      </Collapsible>
    </Card>
  );
}

function Connectors({ view, shell }: { readonly view: ConnectorsView; readonly shell: ShellView | undefined }) {
  const [isNarrow, go, doing, clock] = [useMediaQuery("(max-width: 900px)"), useGo(), useDoing(), useClock()];
  const ids = view.connectors.map((c) => c.id);
  const [open, setOpen] = useState<Set<string>>(() => new Set(ids));
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(view.accounts.filter((a) => !a.works).map((a) => a.account)));
  const toggleRow = (k: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const all = open.size === ids.length;
  const offline = view.accounts.filter((a) => !a.works).length;
  return (
    <VStack gap={4}>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <VStack gap={0.5}>
            <Heading level={3} accessibilityLevel={2}>
              Connectors
            </Heading>
            <Text type="supporting" color="secondary">
              {view.accounts.length} accounts on {view.connectors.length} connectors. {offline} does not work.
            </Text>
          </VStack>
        </StackItem>
        <Button label={all ? "Collapse all" : "Expand all"} variant="ghost" onClick={() => setOpen(all ? new Set() : new Set(ids))} />
        <DropdownMenu
          button={{ label: "Connect something", variant: "secondary" }}
          items={view.connectors.map((c) => ({
            label: c.name,
            onClick: () =>
              c.id === "github"
                ? go("/settings/connectors/github")
                : void doing("connector.connect", { connector: c.id }, ["/settings/connectors"]),
          }))}
        />
      </HStack>
      {view.connectors.map((c) => (
        <Group
          key={c.id}
          c={c}
          accounts={view.accounts.filter((a) => a.connector === c.id).map((a) => ({ ...a }))}
          isNarrow={isNarrow}
          isOpen={open.has(c.id)}
          expanded={expanded}
          onToggle={toggleRow}
          doing={doing}
          held={(a) => heldBy(a, shell)}
          last={(a) => clock.short(a.lastUsed)}
          onOpen={(o) =>
            setOpen((s) => {
              const n = new Set(s);
              if (o) n.add(c.id);
              else n.delete(c.id);
              return n;
            })
          }
        />
      ))}
    </VStack>
  );
}

/** Every connector of the workspace and its accounts: whose, who uses it, whether it works. */
export default function ConnectorsPage() {
  const shell = useRead("/shell");
  return (
    <Reading from="/settings/connectors">
      {(view) => <Connectors view={view} shell={shell._tag === "Ok" ? shell.value : undefined} />}
    </Reading>
  );
}
