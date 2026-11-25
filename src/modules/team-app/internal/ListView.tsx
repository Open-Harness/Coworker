import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { BoardData, TaskCard } from "../types.ts";
import { StageBadge, agentsOn, laneTone, shown } from "./parts.tsx";

/** Table rows are plain records; each holds its task. */
type Row = { readonly [key: string]: unknown; readonly id: string; readonly task: TaskCard };

const columns = (board: BoardData, onOpen: (id: string) => void): TableColumn<Row>[] => [
  { key: "id", header: "Id", width: pixel(72), renderCell: ({ task }) => <Text type="supporting">{task.id}</Text> },
  {
    key: "task",
    header: "Task",
    width: proportional(1, { minWidth: 200 }),
    renderCell: ({ task }) => (
      <Link color="primary" weight="medium" onClick={() => onOpen(task.id)}>
        {task.title}
      </Link>
    ),
  },
  { key: "stage", header: "Stage", width: pixel(180), renderCell: ({ task }) => <StageBadge board={board} task={task} /> },
  ...board.fields.map(({ key, label }): TableColumn<Row> => ({
    key: `field-${key}`,
    header: label,
    width: pixel(120),
    renderCell: ({ task }) => <Text>{shown(task.values[key])}</Text>,
  })),
  { key: "agents", header: "Agents", width: pixel(110), renderCell: ({ task }) => <Text color="secondary">{agentsOn(task)}</Text> },
  { key: "owner", header: "Started by", width: pixel(130), renderCell: ({ task }) => <Text color="secondary">{task.createdBy}</Text> },
  {
    key: "added",
    header: "Added",
    width: pixel(130),
    renderCell: ({ task }) => <Timestamp value={Math.floor(task.createdAt / 1000)} format="relative" />,
  },
];

/** A table per lane. */
export function ListView({ board, onOpen }: { readonly board: BoardData; readonly onOpen: (id: string) => void }) {
  if (board.lanes.length === 0) return <EmptyState title="No lanes" description="Ask the manager to add one." />;
  return (
    <VStack gap={5}>
      {board.lanes.map((lane) => {
        const tasks = board.tasks.filter((task) => task.lane === lane.id);
        return (
          <VStack key={lane.id} gap={2}>
            <HStack gap={2} vAlign="center">
              <StatusDot variant={laneTone(board, lane)} label={lane.name} />
              <Heading level={4} accessibilityLevel={2}>
                {lane.name}
              </Heading>
              <Text type="supporting" hasTabularNumbers>
                {tasks.length}
              </Text>
            </HStack>
            {tasks.length === 0 ? (
              <Text type="supporting">Nothing here</Text>
            ) : (
              <Card padding={0}>
                <Table data={tasks.map((task): Row => ({ id: task.id, task }))} columns={columns(board, onOpen)} idKey="id" hasHover />
              </Card>
            )}
          </VStack>
        );
      })}
    </VStack>
  );
}
