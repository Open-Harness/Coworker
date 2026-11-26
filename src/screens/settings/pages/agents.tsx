// astryx-template: table
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Token } from "@astryxdesign/core/Token";
import { useToast } from "@astryxdesign/core/Toast";
import { Reading, useRead } from "~/modules/page/service.ts";
import type { SharedView } from "~/modules/views-workspace/types.ts";
import { connectorName, day } from "../format.ts";
import { ModelPicker, nameOf, type Connections } from "../model-picker.tsx";
import { useOpenRow } from "../rows.ts";
import { Split } from "../split.tsx";
import type { Dirty } from "../types.ts";

type Agent = SharedView["agents"][number] & Record<string, unknown>;

/** Base tools by name, and connector actions as `github.push`: `Box, GitHub to push, open pull request`. */
export function toolsSaid(tools: readonly string[]): string {
  if (tools.length === 0) return "None";
  const base = tools.filter((t) => !t.includes(".")).map((t) => t.charAt(0).toUpperCase() + t.slice(1));
  const grouped = new Map<string, string[]>();
  for (const t of tools.filter((x) => x.includes("."))) {
    const [connector = "", action = ""] = t.split(".");
    grouped.set(connector, [...(grouped.get(connector) ?? []), action.replaceAll("_", " ")]);
  }
  return [...base, ...[...grouped].map(([connector, actions]) => `${connectorName(connector)} to ${actions.join(", ")}`)].join(", ");
}
const measureValue = (n: number, of: number | null): string => (of === null ? `${Math.round(n * 100)}%` : `${n} of ${of}`);

interface DetailProps {
  readonly a: Agent;
  readonly told: string;
  readonly model: string;
  readonly connections: Connections;
  readonly skills: SharedView["skills"];
  readonly zone: string;
  readonly onTold: (v: string) => void;
  readonly onModel: (v: string) => void;
}

function Detail({ a, told, model, connections, skills, zone, onTold, onModel }: DetailProps) {
  const toast = useToast();
  const m = a.measure;
  return (
    <VStack gap={4}>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <VStack gap={0.5}>
            <Heading level={3} accessibilityLevel={3}>
              {a.name}
            </Heading>
            <Text type="supporting" color="secondary">
              {a.is}
            </Text>
          </VStack>
        </StackItem>
        <Button
          label="Use it in a manager"
          variant="secondary"
          size="sm"
          onClick={() => toast({ body: "Open a manager’s playbook and pick it from its agents", uniqueID: "use" })}
        />
      </HStack>
      <MetadataList columns={2}>
        <MetadataListItem label="Saved by">
          {a.saved.by}, {day(a.saved.at, zone)}
        </MetadataListItem>
        <MetadataListItem label="Made in">{a.from}</MetadataListItem>
        <MetadataListItem label="Used by">{a.usedBy.join(", ")}</MetadataListItem>
        <MetadataListItem label="Tools">{toolsSaid(a.tools)}</MetadataListItem>
        <MetadataListItem label="Measure">
          {m.counts}: {measureValue(m.first, m.of)} at first, {measureValue(m.now, m.of)} now, the line is {measureValue(m.line, m.of)}
        </MetadataListItem>
      </MetadataList>
      <TextArea
        label="What it is told"
        description="Each manager that uses it keeps its own copy once it is put in, and can change it there."
        rows={6}
        value={told}
        onChange={onTold}
      />
      <VStack gap={1}>
        <ModelPicker
          connections={connections}
          inherit={false}
          value={model}
          onChange={onModel}
          thinking={a.model === "inherit" ? "Medium" : a.model.thinking.charAt(0).toUpperCase() + a.model.thinking.slice(1)}
        />
        <Text type="supporting" color="secondary">
          Its own. A manager may choose another for its copy, and a template names none.
        </Text>
      </VStack>
      <VStack gap={1}>
        <Text type="label">Skills</Text>
        <HStack gap={1} wrap="wrap">
          {a.skills.map((id) => (
            <Token key={id} size="sm" label={skills.find((k) => k.id === id)?.name ?? id} />
          ))}
        </HStack>
      </VStack>
    </VStack>
  );
}

function Agents({
  view,
  connections,
  zone,
  onDirty,
}: {
  readonly view: SharedView;
  readonly connections: Connections;
  readonly zone: string;
  readonly onDirty: Dirty;
}) {
  const toast = useToast();
  const agents: Agent[] = view.agents.map((a) => ({ ...a }));
  const [open, setOpen] = useState<string | null>(useMediaQuery("(max-width: 1100px)") ? null : (agents[agents.length - 1]?.id ?? null));
  const [told, setTold] = useState<Record<string, string>>(() => Object.fromEntries(agents.map((a) => [a.id, a.told])));
  const [model, setModel] = useState<Record<string, string>>(() =>
    Object.fromEntries(agents.map((a) => [a.id, a.model === "inherit" ? "" : nameOf(connections, a.model)])),
  );
  const row = useOpenRow<Agent>(open, (a) => setOpen(a.id));
  const a = agents.find((x) => x.id === open);
  const kept = () => onDirty(() => toast({ body: "Saved", uniqueID: "save" }));
  const cols: TableColumn<Agent>[] = [
    {
      key: "name",
      header: "Agent",
      width: proportional(2, { minWidth: 150 }),
      renderCell: (x) => (
        <VStack gap={0}>
          <Text type="label" maxLines={1}>
            {x.name}
          </Text>
          <Text type="supporting" color="secondary" maxLines={2}>
            {x.is}
          </Text>
        </VStack>
      ),
    },
    { key: "from", header: "From", width: pixel(96), renderCell: (x) => <Text maxLines={1}>{x.from}</Text> },
  ];
  const list = (
    <VStack gap={3}>
      <VStack gap={0.5}>
        <Heading level={3} accessibilityLevel={2}>
          Agents
        </Heading>
        <Text type="supporting" color="secondary">
          Roles that were saved to use again. A manager’s own agents are in its playbook.
        </Text>
      </VStack>
      <Table<Agent> data={agents} columns={cols} idKey="id" density="compact" dividers="rows" verticalAlign="top" plugins={{ row }} />
    </VStack>
  );
  return (
    <Split
      list={list}
      width={360}
      back={{ label: "All agents", onBack: () => setOpen(null) }}
      detail={
        a ? (
          <Detail
            key={a.id}
            a={a}
            told={told[a.id] ?? ""}
            model={model[a.id] ?? ""}
            connections={connections}
            skills={view.skills}
            zone={zone}
            onTold={(v) => {
              setTold((t) => ({ ...t, [a.id]: v }));
              kept();
            }}
            onModel={(v) => {
              setModel((m) => ({ ...m, [a.id]: v }));
              kept();
            }}
          />
        ) : null
      }
    />
  );
}

/** Roles that were saved to use again, from any manager. */
export default function AgentsPage({ onDirty }: { readonly onDirty: Dirty }) {
  const [shell, keys] = [useRead("/shell"), useRead("/settings/keys")];
  const zone = shell._tag === "Ok" ? shell.value.workspace.zone : "UTC";
  return (
    <Reading from="/settings/shared">
      {(view) => <Agents view={view} connections={keys._tag === "Ok" ? keys.value.models : []} zone={zone} onDirty={onDirty} />}
    </Reading>
  );
}
