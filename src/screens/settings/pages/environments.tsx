// astryx-template: detail-page
import { useState } from "react";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { Reading, useClock, useRead } from "~/modules/page/service.ts";
import type { SharedView } from "~/modules/views-workspace/types.ts";
import { Detail, type Env } from "./environment-detail.tsx";
import { useOpenRow } from "../rows.ts";
import { Split } from "../split.tsx";
import type { Dirty } from "../types.ts";

function Environments({ view, zone, onDirty }: { readonly view: SharedView; readonly zone: string; readonly onDirty: Dirty }) {
  const [toast, clock] = [useToast(), useClock()];
  const envs: Env[] = view.environments.map((e) => ({ ...e }));
  const [open, setOpen] = useState<string | null>(useMediaQuery("(max-width: 1100px)") ? null : (envs[0]?.id ?? null));
  const [script, setScript] = useState<Record<string, string>>(() => Object.fromEntries(envs.map((e) => [e.id, e.setUp])));
  const [size, setSize] = useState<Record<string, string>>(() => Object.fromEntries(envs.map((e) => [e.id, e.size])));
  const row = useOpenRow<Env>(open, (e) => setOpen(e.id));
  const e = envs.find((x) => x.id === open);
  const kept = () => onDirty(() => toast({ body: "Saved", uniqueID: "save" }));
  const cols: TableColumn<Env>[] = [
    {
      key: "name",
      header: "Environment",
      width: proportional(2, { minWidth: 150 }),
      renderCell: (x) => (
        <VStack gap={0}>
          <Text type="label" maxLines={1}>
            {x.name}
          </Text>
          <Text type="supporting" color="secondary" maxLines={1}>
            {x.usedBy.join(", ")}
          </Text>
        </VStack>
      ),
    },
    {
      key: "last",
      header: "Last start",
      width: pixel(100),
      align: "end",
      renderCell: (x) => (
        <HStack gap={1.5} vAlign="center" hAlign="end">
          <StatusDot variant={x.starts[0]?.ok ? "neutral" : "error"} label={x.starts[0]?.ok ? "Ok" : "Failed"} />
          <Text color="secondary" hasTabularNumbers>
            {x.starts[0] === undefined ? "" : clock.time(x.starts[0].at)}
          </Text>
        </HStack>
      ),
    },
  ];
  const list = (
    <VStack gap={3}>
      <VStack gap={0.5}>
        <Heading level={3} accessibilityLevel={2}>
          Environments
        </Heading>
        <Text type="supporting" color="secondary">
          Where threads run. A manager picks one, and every thread gets its own copy.
        </Text>
      </VStack>
      <Table<Env> data={envs} columns={cols} idKey="id" density="compact" dividers="rows" verticalAlign="top" plugins={{ row }} />
    </VStack>
  );
  return (
    <Split
      list={list}
      width={360}
      back={{ label: "All environments", onBack: () => setOpen(null) }}
      detail={
        e ? (
          <Detail
            key={e.id}
            e={e}
            zone={zone}
            script={script[e.id] ?? ""}
            size={size[e.id] ?? e.size}
            onScript={(v) => {
              setScript((s) => ({ ...s, [e.id]: v }));
              kept();
            }}
            onSize={(v) => {
              setSize((s) => ({ ...s, [e.id]: v }));
              kept();
            }}
          />
        ) : null
      }
    />
  );
}

/** Where threads run, for every manager: a set-up, secrets by name, a size, and how it started. */
export default function EnvironmentsPage({ onDirty }: { readonly onDirty: Dirty }) {
  const shell = useRead("/shell");
  const zone = shell._tag === "Ok" ? shell.value.workspace.zone : "UTC";
  return <Reading from="/settings/shared">{(view) => <Environments view={view} zone={zone} onDirty={onDirty} />}</Reading>;
}
