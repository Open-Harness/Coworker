import { EmptyState } from "@astryxdesign/core/EmptyState";
import { VStack } from "@astryxdesign/core/Layout";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Table } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import type { OverviewData } from "../types.ts";

type Row = OverviewData["agents"][number];

const COLUMNS = [
  { key: "agent", header: "Agent" },
  { key: "tasks", header: "Tasks", align: "end" },
  { key: "running", header: "Running now", align: "end" },
  {
    key: "progress",
    header: "Progress",
    renderCell: ({ agent, tasks, done }: Row) => (
      <ProgressBar
        label={`${agent}: tasks done`}
        isLabelHidden
        value={done}
        max={Math.max(tasks, 1)}
        hasValueLabel
        formatValueLabel={() => `${done} of ${tasks} done`}
        variant={tasks > 0 && done === tasks ? "success" : "accent"}
      />
    ),
  },
] as const;

/** Each agent that has worked here: the tasks it took part in and how many of them reached the last lane. */
export function AgentsTable({ agents }: { readonly agents: OverviewData["agents"] }) {
  return (
    <VStack gap={3}>
      <VStack gap={0.5}>
        <Heading level={3}>Agents</Heading>
        <Text type="supporting" color="secondary">
          Tasks each agent has worked on, and how many are done
        </Text>
      </VStack>
      {agents.length === 0 ? (
        <EmptyState
          title="No agent has worked here yet"
          description="When the manager starts an agent on a task, it is listed here."
          isCompact
        />
      ) : (
        <Table data={[...agents]} idKey="agent" columns={COLUMNS.map((column) => ({ ...column }))} density="compact" aria-label="Agents" />
      )}
    </VStack>
  );
}
