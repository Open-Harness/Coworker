import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Breadcrumbs, BreadcrumbItem } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, StackItem, VStack } from "@astryxdesign/core/Layout";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Heading, Text } from "@astryxdesign/core/Text";
import { teamLinks, useNarrow } from "~/modules/team-core/service.ts";
import type { BoardData, BoardScreenProps, View } from "../types.ts";
import { KanbanView } from "./KanbanView.tsx";
import { ListView } from "./ListView.tsx";
import { ConsoleView, InboxView } from "./SplitView.tsx";
import { TaskDetail } from "./TaskDetail.tsx";
import { summary } from "./parts.tsx";

const VIEWS: readonly { readonly value: View; readonly label: string }[] = [
  { value: "kanban", label: "Kanban" },
  { value: "list", label: "List" },
  { value: "console", label: "Console" },
  { value: "inbox", label: "Inbox" },
];
const isView = (value: string): value is View => VIEWS.some((view) => view.value === value);

function Header({ board, view, onView }: { readonly board: BoardData; readonly view: View; readonly onView: (view: View) => void }) {
  return (
    <LayoutHeader padding={4} hasDivider>
      <VStack gap={1}>
        <Breadcrumbs variant="supporting">
          <BreadcrumbItem>{board.managerName}</BreadcrumbItem>
          <BreadcrumbItem isCurrent>Board</BreadcrumbItem>
        </Breadcrumbs>
        <HStack gap={3} vAlign="center" wrap="wrap">
          <Heading level={1}>Board</Heading>
          <StackItem size="fill">
            <Text color="secondary">{summary(board)}</Text>
          </StackItem>
          <SegmentedControl label="View" size="sm" value={view} onChange={(value) => isView(value) && onView(value)}>
            {VIEWS.map(({ value, label }) => (
              <SegmentedControlItem key={value} value={value} label={label} />
            ))}
          </SegmentedControl>
        </HStack>
      </VStack>
    </LayoutHeader>
  );
}

/** A manager's board: the same tasks in whichever of the four views a person picks. A phone shows one task or the board. */
export function BoardScreen({ board, workspaceId, view, onView }: BoardScreenProps) {
  const [openId, setOpenId] = useState<string>();
  const isNarrow = useNarrow();
  const current = view ?? board.defaultView;
  const isSplit = current === "console" || current === "inbox";
  const open = isSplit ? undefined : board.tasks.find(({ id }) => id === openId);
  const detail = open !== undefined && (
    <TaskDetail
      board={board}
      task={open}
      endContent={
        <HStack gap={1} vAlign="center">
          {workspaceId !== undefined && (
            <Button
              label="Open"
              size="sm"
              href={teamLinks.task(workspaceId, board.managerId, open.id)}
              aria-label={`Open ${open.id} as a page`}
            />
          )}
          <IconButton
            label="Close"
            variant="ghost"
            size="sm"
            icon={<Icon icon={XMarkIcon} size="sm" />}
            onClick={() => setOpenId(undefined)}
          />
        </HStack>
      }
    />
  );
  const tasks = (
    <>
      {current === "kanban" && <KanbanView board={board} openId={open?.id} onOpen={setOpenId} />}
      {current === "list" && <ListView board={board} onOpen={setOpenId} />}
      {current === "console" && <ConsoleView board={board} />}
      {current === "inbox" && <InboxView board={board} />}
    </>
  );
  return (
    <Layout
      height="fill"
      header={<Header board={board} view={current} onView={onView} />}
      content={<LayoutContent padding={isSplit ? 0 : 4}>{isNarrow && detail !== false ? detail : tasks}</LayoutContent>}
      {...(isNarrow || detail === false
        ? {}
        : {
            end: (
              <LayoutPanel width={360} padding={4} hasDivider label="Task">
                {detail}
              </LayoutPanel>
            ),
          })}
    />
  );
}
