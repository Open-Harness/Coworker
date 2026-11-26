// astryx-template: detail-page
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Selector } from "@astryxdesign/core/Selector";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { useClock } from "~/modules/page/service.ts";
import type { SharedView } from "~/modules/views-workspace/types.ts";
import { useDoing } from "../doing.ts";
import { dayAndTime, day, took } from "../format.ts";

export type Env = SharedView["environments"][number] & Record<string, unknown>;
export type Start = Env["starts"][number] & Record<string, unknown>;
/** What a thread gets while it works in an environment. */
export const SIZES = ["Small: 1 CPU, 2 GB", "Medium: 2 CPU, 4 GB", "Large: 4 CPU, 8 GB"] as const;

interface DetailProps {
  readonly e: Env;
  readonly zone: string;
  readonly script: string;
  readonly size: string;
  readonly onScript: (v: string) => void;
  readonly onSize: (v: string) => void;
}

export function Detail({ e, zone, script, size, onScript, onSize }: DetailProps) {
  const [toast, clock, doing] = [useToast(), useClock(), useDoing()];
  const [isEditing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [names, setNames] = useState<readonly { name: string; changed: number }[]>(e.secrets);
  const last = e.starts[0];
  const starts: TableColumn<Start>[] = [
    {
      key: "at",
      header: "Started",
      width: proportional(2, { minWidth: 110 }),
      renderCell: (s) => <Text hasTabularNumbers>{dayAndTime(s.at, zone, clock)}</Text>,
    },
    {
      key: "took",
      header: "Took",
      width: pixel(80),
      align: "end",
      renderCell: (s) => (
        <Text color="secondary" hasTabularNumbers>
          {took(s.took)}
        </Text>
      ),
    },
    {
      key: "ok",
      header: "Ended",
      width: proportional(3, { minWidth: 120 }),
      renderCell: (s) => (
        <HStack gap={1.5} vAlign="center">
          <StatusDot variant={s.ok ? "neutral" : "error"} label={s.ok ? "Ok" : "Failed"} />
          <Text maxLines={2} color={s.ok ? "secondary" : "primary"}>
            {s.ok ? "Ok" : (s.why ?? "Failed")}
          </Text>
        </HStack>
      ),
    },
  ];
  return (
    <VStack gap={4}>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <VStack gap={0.5}>
            <Heading level={3} accessibilityLevel={3}>
              {e.name}
            </Heading>
            <Text type="supporting" color="secondary">
              {e.about}
            </Text>
          </VStack>
        </StackItem>
        <Button
          label="Start one to try"
          variant="secondary"
          size="sm"
          onClick={() => toast({ body: `${e.name} started in ${last === undefined ? "a few seconds" : took(last.took)}`, uniqueID: e.id })}
        />
      </HStack>
      <MetadataList columns={2}>
        <MetadataListItem label="Used by">{e.usedBy.join(", ")}</MetadataListItem>
        <MetadataListItem label="Last start">
          {last === undefined ? "Never" : `${dayAndTime(last.at, zone, clock)}, ${last.ok ? "ok" : "failed"}`}
        </MetadataListItem>
      </MetadataList>
      <Selector
        label="Size"
        description="What a thread gets while it works here."
        value={size}
        onChange={onSize}
        options={[...new Set<string>([...SIZES, size])].map((s) => ({ value: s, label: s }))}
      />
      <Divider />
      <VStack gap={2}>
        <HStack gap={2} vAlign="center">
          <StackItem size="fill">
            <VStack gap={0.5}>
              <Text type="label">Set-up script</Text>
              <Text type="supporting" color="secondary">
                Runs once on each start, before a thread does anything.
              </Text>
            </VStack>
          </StackItem>
          <StackItem size="static">
            <Button label={isEditing ? "Done" : "Edit"} variant="ghost" size="sm" onClick={() => setEditing(!isEditing)} />
          </StackItem>
        </HStack>
        {isEditing ? (
          <TextArea label="Set-up script" isLabelHidden rows={6} value={script} onChange={onScript} />
        ) : script.trim() === "" ? (
          <Text color="secondary">Nothing. It starts as it is.</Text>
        ) : (
          <CodeBlock code={script} language="bash" size="sm" width="100%" hasLanguageLabel={false} />
        )}
      </VStack>
      <Divider />
      <VStack gap={2}>
        <VStack gap={0.5}>
          <Text type="label">Secrets</Text>
          <Text type="supporting" color="secondary">
            By name only. A value is opened for one call and is never shown, here or to a thread.
          </Text>
        </VStack>
        {names.length === 0 ? (
          <Text color="secondary">None.</Text>
        ) : (
          names.map((n) => (
            <HStack key={n.name} gap={2} vAlign="center">
              <StackItem size="fill">
                <VStack gap={0}>
                  <Text>{n.name}</Text>
                  <Text type="supporting" color="secondary">
                    Changed {day(n.changed, zone)}
                  </Text>
                </VStack>
              </StackItem>
              <Button label="Take it away" variant="ghost" size="sm" onClick={() => setNames((l) => l.filter((x) => x.name !== n.name))} />
            </HStack>
          ))
        )}
        <HStack gap={2} vAlign="end">
          <StackItem size="fill">
            <TextInput label="Add a secret, by name" placeholder="SENTRY_AUTH_TOKEN" value={name} onChange={setName} />
          </StackItem>
          <Button
            label="Add"
            variant="secondary"
            isDisabled={name.trim() === ""}
            onClick={() => {
              setNames((l) => [...l, { name: name.trim(), changed: clock.now() }]);
              setName("");
              void doing("environment.add", { environment: e.id, secret: name.trim() }, ["/settings/shared"]);
            }}
          />
        </HStack>
      </VStack>
      <Divider />
      <VStack gap={2}>
        <Text type="label">Last starts</Text>
        <Table<Start>
          data={e.starts.map((s) => ({ ...s }))}
          columns={starts}
          idKey="at"
          density="compact"
          dividers="rows"
          verticalAlign="top"
        />
      </VStack>
    </VStack>
  );
}
