// astryx-template: detail-page
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Token } from "@astryxdesign/core/Token";
import { day } from "../format.ts";
import type { Manager, Server, Setting, Tool } from "./mcp-types.ts";

const SETTINGS: readonly { value: Setting; label: string }[] = [
  { value: "on", label: "On" },
  { value: "ask", label: "Ask" },
  { value: "off", label: "Off" },
];
const asks = (s: Server): number => s.tools.filter((x) => x.is === "ask").length;

function ToolTable({
  s,
  onSet,
  narrow,
}: {
  readonly s: Server;
  readonly onSet: (tool: string, v: Setting) => void;
  readonly narrow: boolean;
}) {
  const cols: TableColumn<Tool>[] = [
    {
      key: "name",
      header: "Tool",
      width: proportional(3, { minWidth: 150 }),
      renderCell: (x) => (
        <VStack gap={0}>
          <Text type="label" maxLines={1}>
            {x.name}
          </Text>
          <Text type="supporting" color="secondary" maxLines={narrow ? 3 : 2}>
            {x.says}
          </Text>
        </VStack>
      ),
    },
    ...(narrow
      ? []
      : [
          {
            key: "kind",
            header: "It",
            width: pixel(96),
            renderCell: (x: Tool) => <Token size="sm" label={x.readOnly ? "Reads" : "Changes"} />,
          },
        ]),
    {
      key: "set",
      header: "Starts",
      width: pixel(narrow ? 150 : 170),
      renderCell: (x) => (
        <SegmentedControl label={`${x.name} starts`} size="sm" value={x.is} onChange={(v) => onSet(x.name, v as Setting)}>
          {SETTINGS.map((o) => (
            <SegmentedControlItem key={o.value} value={o.value} label={o.label} />
          ))}
        </SegmentedControl>
      ),
    },
  ];
  return <Table<Tool> data={[...s.tools]} columns={cols} idKey="name" density="compact" dividers="rows" verticalAlign="top" />;
}

interface DetailProps {
  readonly s: Server;
  readonly managers: readonly Manager[];
  readonly signIn: string;
  readonly checked: string;
  readonly zone: string;
  readonly who: string[];
  readonly onSet: (tool: string, v: Setting) => void;
  readonly onWho: (v: string[]) => void;
  readonly onCheck: () => void;
  readonly onTakeAway: () => void;
  readonly onBack?: () => void;
  readonly narrow: boolean;
}

export function Detail({ s, managers, signIn, checked, zone, who, onSet, onWho, onCheck, onTakeAway, onBack, narrow }: DetailProps) {
  return (
    <VStack gap={4}>
      {onBack ? (
        <HStack>
          <Button label="All servers" variant="ghost" size="sm" onClick={onBack} />
        </HStack>
      ) : null}
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <VStack gap={0.5}>
            <Heading level={3} accessibilityLevel={3}>
              {s.name}
            </Heading>
            <HStack gap={1.5} vAlign="center">
              <StatusDot variant={s.state._tag === "Works" ? "neutral" : "error"} label={s.state._tag === "Works" ? "Works" : "Failed"} />
              <Text type="supporting" color="secondary">
                {checked}
              </Text>
            </HStack>
          </VStack>
        </StackItem>
        <Button label="Check it" variant="secondary" size="sm" onClick={onCheck} />
        <Button label="Take it away" variant="ghost" size="sm" onClick={onTakeAway} />
      </HStack>
      <MetadataList columns={narrow ? 1 : 2}>
        <MetadataListItem label="Address">{s.url}</MetadataListItem>
        <MetadataListItem label="Signs in">{signIn}</MetadataListItem>
        <MetadataListItem label="Added by">
          {s.by}, {day(s.added, zone)}
        </MetadataListItem>
        <MetadataListItem label="Tools">
          {s.tools.length}, {asks(s)} ask first
        </MetadataListItem>
      </MetadataList>
      <Divider />
      <VStack gap={1}>
        <Heading level={4} accessibilityLevel={4}>
          Tools
        </Heading>
        <Text type="supporting" color="secondary">
          A tool that only reads starts on. The others start at ask: a person says yes each time. Off, and no manager sees it.
        </Text>
      </VStack>
      <ToolTable s={s} onSet={onSet} narrow={narrow} />
      <Divider />
      <VStack gap={2}>
        <VStack gap={0.5}>
          <Heading level={4} accessibilityLevel={4}>
            Which managers have it
          </Heading>
          <Text type="supporting" color="secondary">
            A manager has the tools above that are on or ask. What a piece of work may use is its mandate, and it never grows.
          </Text>
        </VStack>
        <CheckboxList label="Managers" isLabelHidden value={who} onChange={(v: string[]) => onWho(v)}>
          {managers.map((m) => (
            <CheckboxListItem key={m.id} value={m.id} label={m.name} />
          ))}
        </CheckboxList>
      </VStack>
    </VStack>
  );
}

/** A server is an address and a way to sign in. This one asks for both, and then looks at what it offers. */
export function Add({
  onAdd,
  onBack,
}: {
  readonly onAdd: (address: string, secret: string | undefined) => void;
  readonly onBack?: () => void;
}) {
  const [address, setAddress] = useState("");
  const [how, setHow] = useState("key");
  const [key, setKey] = useState("");
  return (
    <VStack gap={4}>
      {onBack ? (
        <HStack>
          <Button label="All servers" variant="ghost" size="sm" onClick={onBack} />
        </HStack>
      ) : null}
      <VStack gap={0.5}>
        <Heading level={3} accessibilityLevel={3}>
          Add a server
        </Heading>
        <Text type="supporting" color="secondary">
          Tools without code: an address and a way to sign in. Nothing comes in through it, and it has no board of its own.
        </Text>
      </VStack>
      <TextInput label="Address" placeholder="https://mcp.linear.example/mcp" value={address} onChange={setAddress} />
      <Selector
        label="Signs in with"
        value={how}
        onChange={setHow}
        options={[
          { value: "key", label: "A key" },
          { value: "account", label: "An account, in your browser" },
          { value: "none", label: "Nothing" },
        ]}
      />
      {how === "key" ? (
        <TextInput
          label="Name of the key in Keys"
          description="Co-worker opens it only for one call. It is never shown."
          placeholder="linear-key"
          value={key}
          onChange={setKey}
        />
      ) : null}
      <HStack gap={2}>
        <Button
          label="Add and look at its tools"
          variant="primary"
          isDisabled={address.trim() === ""}
          onClick={() => onAdd(address.trim(), how === "key" && key.trim() !== "" ? key.trim() : undefined)}
        />
      </HStack>
    </VStack>
  );
}
