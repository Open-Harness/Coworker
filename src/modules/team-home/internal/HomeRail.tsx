import type { ReactNode } from "react";
import { BellAlertIcon, CheckCircleIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { Badge } from "@astryxdesign/core/Badge";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { Token } from "@astryxdesign/core/Token";
import { teamLinks } from "~/modules/team-core/service.ts";
import type { HomeData, HomeManager } from "../types.ts";
import { plural } from "./Tile.tsx";

/** The right-hand rail: what needs the person, then the managers and how each is doing. */

const STATE = {
  needs: { dot: "warning", token: "yellow", label: "Needs you" },
  working: { dot: "success", token: "green", label: "Working" },
  idle: { dot: "neutral", token: "gray", label: "Idle" },
} as const;

const stateOf = (manager: HomeManager): keyof typeof STATE =>
  manager.waitingOnPeople > 0 ? "needs" : manager.runningAgents > 0 ? "working" : "idle";

function Section({
  icon,
  title,
  subtitle,
  badge,
  children,
}: {
  readonly icon: typeof BellAlertIcon;
  readonly title: string;
  readonly subtitle: string;
  readonly badge: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <VStack gap={0}>
      <VStack gap={1} padding={4}>
        <HStack gap={2} vAlign="center">
          <Icon icon={icon} size="sm" color="secondary" />
          <StackItem size="fill">
            <Heading level={3}>{title}</Heading>
          </StackItem>
          {badge}
        </HStack>
        <Text type="supporting" color="secondary">
          {subtitle}
        </Text>
      </VStack>
      <Divider />
      {children}
    </VStack>
  );
}

function NeedsYou({ workspaceId, needs }: { readonly workspaceId: string; readonly needs: HomeData["needsYou"] }) {
  return (
    <Section
      icon={BellAlertIcon}
      title="Needs you"
      subtitle="Open questions and approvals, newest first"
      badge={<Badge label={String(needs.total)} variant={needs.total > 0 ? "warning" : "neutral"} />}
    >
      {needs.items.length === 0 ? (
        <EmptyState
          title="Nothing waits for you"
          description="A question or an approval from a manager shows up here."
          icon={<Icon icon={CheckCircleIcon} size="lg" color="success" />}
          isCompact
        />
      ) : (
        <List density="compact" hasDividers aria-label="Needs you">
          {needs.items.map((item) => (
            <ListItem
              key={item.id}
              label={item.title}
              description={`${item.managerName} · ${item.kind === "approval" ? "Approval" : "Question"}`}
              href={teamLinks.item(workspaceId, item.id)}
              endContent={<Timestamp value={new Date(item.createdAt).toISOString()} format="relative" color="secondary" />}
            />
          ))}
        </List>
      )}
      {needs.total > needs.items.length && (
        <Text type="supporting" color="secondary">{`${needs.total - needs.items.length} more in the Inbox`}</Text>
      )}
    </Section>
  );
}

function Managers({
  workspaceId,
  managers,
  canSeeTasks,
}: {
  readonly workspaceId: string;
  readonly managers: readonly HomeManager[];
  readonly canSeeTasks: boolean;
}) {
  return (
    <Section
      icon={UserGroupIcon}
      title="Managers"
      subtitle="Where each one stands"
      badge={<Badge label={String(managers.length)} variant="neutral" />}
    >
      {managers.length === 0 ? (
        <EmptyState
          title={canSeeTasks ? "No managers yet" : "Nothing to show"}
          description="A manager made with New manager appears here."
          isCompact
        />
      ) : (
        <List density="compact" hasDividers aria-label="Managers">
          {managers.map((manager) => {
            const state = STATE[stateOf(manager)];
            return (
              <ListItem
                key={manager.managerId}
                label={manager.name}
                description={`${plural(manager.openTasks, "open task")} · ${plural(manager.runningAgents, "agent")} running`}
                href={teamLinks.overview(workspaceId, manager.managerId)}
                startContent={<StatusDot variant={state.dot} label={state.label} />}
                endContent={<Token size="sm" color={state.token} label={state.label} />}
              />
            );
          })}
        </List>
      )}
    </Section>
  );
}

/** The two sections; they fold into the content below a narrow width, or stay a rail that scrolls on its own. */
export function HomeRail({ workspaceId, data }: { readonly workspaceId: string; readonly data: HomeData }) {
  return (
    <VStack gap={0}>
      <NeedsYou workspaceId={workspaceId} needs={data.needsYou} />
      <Divider />
      <Managers workspaceId={workspaceId} managers={data.managers} canSeeTasks={data.canSeeTasks} />
    </VStack>
  );
}
