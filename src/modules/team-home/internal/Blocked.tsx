import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Heading, Text } from "@astryxdesign/core/Text";
import { teamLinks } from "~/modules/team-core/service.ts";
import type { OverviewData } from "../types.ts";

/** Tasks that wait for a person: each opens the task. Nothing is dated, so the list is newest first, as the server sent it. */
export function Blocked({ workspaceId, data }: { readonly workspaceId: string; readonly data: OverviewData }) {
  return (
    <VStack gap={3}>
      <VStack gap={0.5}>
        <Heading level={3}>Blocked and waiting</Heading>
        <Text type="supporting" color="secondary">
          Tasks that need a person to answer, review or unblock them
        </Text>
      </VStack>
      {data.blocked.length === 0 ? (
        <EmptyState
          title="Nothing waits for a person"
          description="When a task needs an answer or a review, it is listed here."
          icon={<Icon icon={CheckCircleIcon} size="lg" color="success" />}
          isCompact
        />
      ) : (
        <List density="compact" hasDividers aria-label="Blocked and waiting">
          {data.blocked.map((task) => (
            <ListItem
              key={task.id}
              label={task.title}
              description={`${task.id} · ${task.reason}`}
              href={teamLinks.task(workspaceId, data.managerId, task.id)}
            />
          ))}
        </List>
      )}
    </VStack>
  );
}
