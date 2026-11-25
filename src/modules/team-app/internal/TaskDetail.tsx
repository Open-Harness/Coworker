import type { ReactNode } from "react";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Markdown } from "@astryxdesign/core/Markdown";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { BoardData, TaskCard } from "../types.ts";
import { StageBadge, agentsOn, laneName, shown } from "./parts.tsx";

/** What a task is: its title, where it waits and its words. */
export function TaskBody({
  board,
  task,
  endContent,
}: {
  readonly board: BoardData;
  readonly task: TaskCard;
  readonly endContent?: ReactNode;
}) {
  return (
    <VStack gap={4}>
      <VStack gap={2}>
        <HStack gap={2} vAlign="center" minHeight={32}>
          <Text type="supporting">{task.id}</Text>
          <StackItem size="fill">
            <StageBadge board={board} task={task} />
          </StackItem>
          {endContent}
        </HStack>
        <Heading level={2}>{task.title}</Heading>
      </VStack>
      {task.description === "" ? (
        <Text color="secondary">No description yet. Ask the manager to write one in its chat.</Text>
      ) : (
        <Markdown headingLevelStart={3}>{task.description}</Markdown>
      )}
    </VStack>
  );
}

/** Where a task is, and what each field says. */
export function TaskFacts({ board, task }: { readonly board: BoardData; readonly task: TaskCard }) {
  const facts: readonly (readonly [string, string])[] = [
    ["Lane", laneName(board, task.lane)],
    ...board.fields.map(({ key, label }) => [label, shown(task.values[key])] as const),
    ["Started by", task.createdBy === "" ? "—" : task.createdBy],
    ["Agents on it", agentsOn(task)],
  ];
  return (
    <MetadataList label={{ position: "start", width: 104 }}>
      {facts.map(([label, value]) => (
        <MetadataListItem key={label} label={label}>
          {value}
        </MetadataListItem>
      ))}
      <MetadataListItem label="Added">
        <Timestamp value={Math.floor(task.createdAt / 1000)} format="relative" />
      </MetadataListItem>
    </MetadataList>
  );
}

/** One task in a side panel. */
export function TaskDetail({
  board,
  task,
  endContent,
}: {
  readonly board: BoardData;
  readonly task: TaskCard;
  readonly endContent?: ReactNode;
}) {
  return (
    <VStack gap={4}>
      <TaskBody board={board} task={task} endContent={endContent} />
      <Divider />
      <TaskFacts board={board} task={task} />
    </VStack>
  );
}
