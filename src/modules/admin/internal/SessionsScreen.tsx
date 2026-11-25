import { useState } from "react";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { Link } from "@astryxdesign/core/Link";
import { Selector } from "@astryxdesign/core/Selector";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { HStack } from "@astryxdesign/core/Layout";
import { proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { links, useDirectory } from "~/modules/app/service.ts";
import type { ChatStatus } from "~/modules/protocol/types.ts";
import { Page } from "~/modules/ui/service.ts";
import { type Filter, filterSessions, sessionRows, type SessionRow } from "./sessions.ts";

const STATUS: Readonly<Record<ChatStatus, { readonly label: string; readonly variant: "neutral" | "accent" | "error" }>> = {
  idle: { label: "Idle", variant: "neutral" },
  working: { label: "Answering", variant: "accent" },
  failed: { label: "Failed", variant: "error" },
};

const columns: TableColumn<SessionRow>[] = [
  {
    key: "title",
    header: "Session",
    width: proportional(2),
    renderCell: (row) => <Link href={links.chat(row.workspaceId, row.chatId)}>{row.title}</Link>,
  },
  { key: "workspace", header: "Workspace" },
  { key: "agent", header: "Agent", renderCell: ({ agent, version }) => (version === undefined ? agent : `${agent} v${version}`) },
  { key: "createdBy", header: "Started by" },
  {
    key: "status",
    header: "Status",
    renderCell: ({ status, isArchived }) => (
      <HStack gap={2} vAlign="center">
        <StatusDot variant={STATUS[status].variant} label={STATUS[status].label} isPulsing={status === "working"} />
        <Text>{isArchived ? "Archived" : STATUS[status].label}</Text>
      </HStack>
    ),
  },
  { key: "updatedAt", header: "Last used", renderCell: ({ updatedAt }) => <Timestamp value={updatedAt / 1000} format="relative" /> },
];

interface ChoiceProps {
  readonly label: string;
  readonly all: string;
  readonly values: readonly string[];
  readonly value: string | undefined;
  readonly onChange: (value: string | undefined) => void;
}
const ALL = "all";
const Choice = ({ label, all, values, value, onChange }: ChoiceProps) => (
  <Selector
    label={label}
    options={[{ value: ALL, label: all }, ...values.map((name) => ({ value: `=${name}`, label: name }))]}
    value={value === undefined ? ALL : `=${value}`}
    onChange={(key) => onChange(key === null || key === ALL ? undefined : key.slice(1))}
  />
);

const distinct = (values: readonly string[]): readonly string[] =>
  [...new Set(values)].toSorted((left, right) => left.localeCompare(right));

/** Every chat of every workspace, to find one and look into it. */
export function SessionsScreen() {
  const { workspaces } = useDirectory();
  const [filter, setFilter] = useState<Filter>({ text: "", state: "Active" });
  const rows = sessionRows(workspaces);
  const change = (part: Partial<Record<keyof Filter, string | undefined>>) => setFilter({ ...filter, ...part } as Filter);
  return (
    <Page
      title="Sessions"
      description="Every chat, whoever started it and whichever agent answers. Open one to read what it did."
      width="wide"
    >
      <Grid columns={{ minWidth: 180 }} gap={3}>
        <TextInput
          label="Find"
          placeholder="Title"
          startIcon="search"
          hasClear
          value={filter.text}
          onChange={(text) => change({ text })}
          width="100%"
        />
        <Choice
          label="Agent"
          all="All agents"
          values={distinct(rows.map(({ agent }) => agent))}
          value={filter.agent}
          onChange={(agent) => change({ agent })}
        />
        <Choice
          label="Started by"
          all="Anyone"
          values={distinct(rows.map(({ createdBy }) => createdBy))}
          value={filter.createdBy}
          onChange={(createdBy) => change({ createdBy })}
        />
        <Choice
          label="Workspace"
          all="All workspaces"
          values={distinct(rows.map(({ workspace }) => workspace))}
          value={filter.workspace}
          onChange={(workspace) => change({ workspace })}
        />
        <Choice
          label="State"
          all="All states"
          values={["Active", "Answering", "Failed", "Archived"]}
          value={filter.state}
          onChange={(state) => change({ state })}
        />
      </Grid>
      <Table
        data={[...filterSessions(rows, filter)]}
        columns={columns}
        idKey="id"
        hasHover
        emptyState={<EmptyState title="No sessions" description="Nothing matches what you chose." />}
      />
    </Page>
  );
}
