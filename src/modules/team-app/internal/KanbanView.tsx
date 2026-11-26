import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useNarrow } from "~/modules/team-core/service.ts";
import type { BoardData, LaneData, TaskCard } from "../types.ts";
import { StageBadge, laneTone, shown } from "./parts.tsx";

interface Opening {
  readonly openId: string | undefined;
  readonly onOpen: (id: string) => void;
}

function TaskTile({ board, task, openId, onOpen }: Opening & { readonly board: BoardData; readonly task: TaskCard }) {
  const filled = board.fields.filter(({ key }) => task.values[key] !== undefined && task.values[key] !== null);
  return (
    <ClickableCard
      padding={3}
      label={`Open ${task.id} ${task.title}`}
      variant={task.id === openId ? "blue" : "default"}
      elevation="low"
      onClick={() => onOpen(task.id)}
    >
      <VStack gap={2}>
        <HStack gap={2} vAlign="center">
          <Text type="supporting" hasTabularNumbers>
            {task.id}
          </Text>
          {filled.slice(0, 1).map(({ key, label }) => (
            <Badge key={key} label={`${label}: ${shown(task.values[key])}`} />
          ))}
        </HStack>
        <Text weight="medium">{task.title}</Text>
        <HStack gap={2} vAlign="center" wrap="wrap">
          <StageBadge board={board} task={task} />
          <Text type="supporting">{task.createdBy}</Text>
        </HStack>
      </VStack>
    </ClickableCard>
  );
}

function Column({ board, lane, ...opening }: Opening & { readonly board: BoardData; readonly lane: LaneData }) {
  const tasks = board.tasks.filter((task) => task.lane === lane.id);
  return (
    <Card variant="muted" padding={3} height="100%">
      <VStack gap={3}>
        <HStack gap={2} vAlign="center" minHeight={24}>
          <StatusDot variant={laneTone(board, lane)} label={lane.name} />
          <StackItem size="fill">
            <Heading level={4} accessibilityLevel={2}>
              {lane.name}
            </Heading>
          </StackItem>
          {lane.needsApproval && <Badge variant="warning" label="Asks first" />}
          <Text type="supporting" hasTabularNumbers>
            {tasks.length}
          </Text>
        </HStack>
        {tasks.map((task) => (
          <TaskTile key={task.id} board={board} task={task} {...opening} />
        ))}
        {tasks.length === 0 && <Text type="supporting">Nothing here</Text>}
      </VStack>
    </Card>
  );
}

/** One column per lane, a card per task. On a phone the lanes go under each other. */
export function KanbanView({ board, ...opening }: Opening & { readonly board: BoardData }) {
  const isNarrow = useNarrow();
  return (
    <Grid columns={isNarrow ? 1 : { minWidth: 140, repeat: "fit" }} gap={3} align="stretch" minHeight="100%">
      {board.lanes.map((lane) => (
        <Column key={lane.id} board={board} lane={lane} {...opening} />
      ))}
    </Grid>
  );
}
