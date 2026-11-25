import { useState } from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack, Layout, LayoutContent, LayoutPanel, VStack } from "@astryxdesign/core/Layout";
import { Icon } from "@astryxdesign/core/Icon";
import { List, ListItem } from "@astryxdesign/core/List";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useNarrow } from "~/modules/team-core/service.ts";
import type { BoardData, BoardScreenProps, TaskCard } from "../types.ts";
import { laneName, needsPerson, stageTone, stageWords } from "./parts.tsx";
import { TaskBody, TaskFacts } from "./TaskDetail.tsx";

type Group = { readonly title: string; readonly tasks: readonly TaskCard[] };

function Rows({
  board,
  group,
  isByLane,
  selected,
  onSelect,
}: {
  readonly board: BoardData;
  readonly group: Group;
  readonly isByLane: boolean;
  readonly selected: string | undefined;
  readonly onSelect: (id: string) => void;
}) {
  if (group.tasks.length === 0) return null;
  return (
    <List
      density="compact"
      header={
        <Text type="label" color="secondary">
          {`${group.title} · ${group.tasks.length}`}
        </Text>
      }
    >
      {group.tasks.map((task) => (
        <ListItem
          key={task.id}
          align="first-line"
          label={task.id === selected ? <Text weight="semibold">{task.title}</Text> : task.title}
          description={[task.id, isByLane ? undefined : laneName(board, task.lane), stageWords(board, task)]
            .filter((part) => part !== undefined)
            .join(" · ")}
          startContent={<StatusDot variant={stageTone(board, task)} label={stageWords(board, task) ?? laneName(board, task.lane)} />}
          isSelected={task.id === selected}
          onClick={() => onSelect(task.id)}
        />
      ))}
    </List>
  );
}

/** One task in place of the list, where there is no room for both. */
function Opened({ board, task, onBack }: Pick<BoardScreenProps, "board"> & { readonly task: TaskCard; readonly onBack: () => void }) {
  return (
    <LayoutContent padding={4}>
      <VStack gap={4}>
        <HStack>
          <Button label="All tasks" size="sm" icon={<Icon icon={ArrowLeftIcon} size="sm" />} onClick={onBack} />
        </HStack>
        <TaskBody board={board} task={task} />
        <Divider />
        <TaskFacts board={board} task={task} />
      </VStack>
    </LayoutContent>
  );
}

/** Tasks in groups on one side, the picked one beside them, its details on the other side. */
function SplitView({
  board,
  groups,
  isByLane = false,
}: Pick<BoardScreenProps, "board"> & { readonly groups: readonly Group[]; readonly isByLane?: boolean }) {
  const [picked, setPicked] = useState<string>();
  const isNarrow = useNarrow();
  const ordered = groups.flatMap(({ tasks }) => tasks);
  const task = ordered.find(({ id }) => id === picked) ?? ordered[0];
  if (task === undefined) return <EmptyState title="No tasks yet" description="Ask the manager for something in its chat." />;
  const rows = (
    <VStack gap={4}>
      {groups.map((group) => (
        <Rows
          key={group.title}
          board={board}
          group={group}
          isByLane={isByLane}
          selected={isNarrow ? undefined : task.id}
          onSelect={setPicked}
        />
      ))}
    </VStack>
  );
  if (isNarrow)
    return (
      <Layout
        height="fill"
        content={
          picked === undefined ? (
            <LayoutContent padding={4}>{rows}</LayoutContent>
          ) : (
            <Opened board={board} task={task} onBack={() => setPicked(undefined)} />
          )
        }
      />
    );
  return (
    <Layout
      height="fill"
      start={
        <LayoutPanel width={340} padding={2} hasDivider label="Tasks">
          {rows}
        </LayoutPanel>
      }
      content={
        <LayoutContent padding={6}>
          <TaskBody board={board} task={task} />
        </LayoutContent>
      }
      end={
        <LayoutPanel width={300} padding={4} hasDivider label="Details">
          <VStack gap={3}>
            <Heading level={4} accessibilityLevel={3}>
              Details
            </Heading>
            <TaskFacts board={board} task={task} />
          </VStack>
        </LayoutPanel>
      }
    />
  );
}

/** The incident console: every task by lane, the picked one with its details. */
export const ConsoleView = ({ board }: { readonly board: BoardData }) => (
  <SplitView
    board={board}
    isByLane
    groups={board.lanes.map((lane) => ({ title: lane.name, tasks: board.tasks.filter((task) => task.lane === lane.id) }))}
  />
);

/** The inbox: what needs a person first, then everything else. */
export const InboxView = ({ board }: { readonly board: BoardData }) => (
  <SplitView
    board={board}
    groups={[
      { title: "Needs you", tasks: board.tasks.filter(needsPerson) },
      { title: "Everything else", tasks: board.tasks.filter((task) => !needsPerson(task)) },
    ]}
  />
);
