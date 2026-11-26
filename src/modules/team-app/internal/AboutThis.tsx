import { Card } from "@astryxdesign/core/Card";
import { VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Heading } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { teamLinks } from "~/modules/team-core/service.ts";
import type { ItemData, RefData } from "../types.ts";

const KIND: Readonly<Record<RefData["kind"], string>> = { task: "Task", page: "Mission page" };

/** Where a linked task or page opens: tasks on the manager's board, pages in its mission. */
export const hrefOf = (workspaceId: string, item: ItemData, ref: RefData): string =>
  ref.kind === "task" ? teamLinks.board(workspaceId, item.managerId) : teamLinks.mission(workspaceId, item.managerId, ref.ref);

function waitingOn({ managerId, task }: ItemData): string {
  if (managerId === "") return "They wait until an Owner answers.";
  return task === undefined ? "The manager waits on this one step." : `Work on ${task} waits on this step. Other work goes on.`;
}

/** Who asked, who may answer, and what waits on it. */
export function AboutThis({ item }: { readonly item: ItemData }) {
  return (
    <Card variant="muted" padding={4}>
      <VStack gap={3}>
        <Heading level={4} accessibilityLevel={2}>
          About this
        </Heading>
        <MetadataList label={{ position: "start", width: 88 }}>
          <MetadataListItem label="Asked by">{item.managerName}</MetadataListItem>
          <MetadataListItem label="Asked">
            <Timestamp value={Math.floor(item.createdAt / 1000)} format="relative" />
          </MetadataListItem>
          {item.kind !== "notice" && <MetadataListItem label="Can answer">{item.managerId === "" ? "Any Owner" : "You"}</MetadataListItem>}
          {item.kind !== "notice" && <MetadataListItem label="Waiting">{waitingOn(item)}</MetadataListItem>}
        </MetadataList>
      </VStack>
    </Card>
  );
}

/** The pages and tasks the manager points at. */
export function ReadMore({ workspaceId, item }: { readonly workspaceId: string; readonly item: ItemData }) {
  if (item.links.length === 0) return null;
  return (
    <VStack gap={2}>
      <Heading level={4} accessibilityLevel={2}>
        Read more
      </Heading>
      <List hasDividers edge="flush">
        {item.links.map((link) => (
          <ListItem
            key={`${link.kind}-${link.ref}`}
            label={link.kind === "task" ? `${link.ref} ${link.title}` : link.title}
            description={`${KIND[link.kind]} · ${link.sub}`}
            href={hrefOf(workspaceId, item, link)}
          />
        ))}
      </List>
    </VStack>
  );
}
