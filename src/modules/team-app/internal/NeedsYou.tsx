import { Breadcrumbs, BreadcrumbItem } from "@astryxdesign/core/Breadcrumbs";
import { Stack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { teamLinks, useNarrow } from "~/modules/team-core/service.ts";
import { Page } from "~/modules/ui/service.ts";
import type { NeedsYouProps } from "../types.ts";
import { AboutThis, ReadMore } from "./AboutThis.tsx";
import { Answered, Decision, ItemBadges, KIND } from "./Decision.tsx";

/** A question opened as its own page: the decision, what the manager knows, the options, and what to read. */
export function NeedsYou({ workspaceId, item, onReply }: NeedsYouProps) {
  const kind = KIND[item.kind];
  const isNarrow = useNarrow();
  const about = item.task === undefined ? kind : `${kind} about ${item.task}`;
  return (
    <Page
      width="wide"
      title={item.title}
      trail={
        <Breadcrumbs variant="supporting">
          <BreadcrumbItem href={teamLinks.inbox(workspaceId)}>Inbox</BreadcrumbItem>
          <BreadcrumbItem>{item.managerName}</BreadcrumbItem>
          <BreadcrumbItem isCurrent>{about}</BreadcrumbItem>
        </Breadcrumbs>
      }
    >
      <ItemBadges item={item} />
      <Answered item={item} />
      <Stack direction={isNarrow ? "vertical" : "horizontal"} gap={8} vAlign="start">
        <StackItem size="fill">
          <Decision workspaceId={workspaceId} item={item} onReply={onReply} />
        </StackItem>
        <VStack gap={6} width={isNarrow ? "100%" : 320}>
          <AboutThis item={item} />
          <ReadMore workspaceId={workspaceId} item={item} />
        </VStack>
      </Stack>
    </Page>
  );
}
