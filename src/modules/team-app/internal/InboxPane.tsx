import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { LayoutPanel, VStack } from "@astryxdesign/core/Layout";
import { Heading } from "@astryxdesign/core/Text";
import { teamLinks } from "~/modules/team-core/service.ts";
import type { ItemData, Reply } from "../types.ts";
import { AboutThis, ReadMore } from "./AboutThis.tsx";
import { Answered, Decision, ItemBadges } from "./Decision.tsx";

/** Astryx's reading pane: what the row is about and how to answer it, the Needs-you page beside the list. */
export function InboxPane({
  workspaceId,
  item,
  onReply,
}: {
  readonly workspaceId: string;
  readonly item: ItemData;
  readonly onReply: (reply: Reply) => Promise<void>;
}) {
  return (
    <LayoutPanel label="Reading pane" width={440} padding={6} hasDivider>
      <VStack gap={6}>
        <VStack gap={3} hAlign="start">
          <ItemBadges item={item} />
          <Heading level={2}>{item.title}</Heading>
          <Button
            label="Open as a page"
            variant="ghost"
            size="sm"
            icon={<Icon icon={ArrowTopRightOnSquareIcon} size="sm" />}
            href={teamLinks.item(workspaceId, item.id)}
          />
        </VStack>
        <Answered item={item} />
        <Decision workspaceId={workspaceId} item={item} onReply={onReply} />
        <AboutThis item={item} />
        <ReadMore workspaceId={workspaceId} item={item} />
      </VStack>
    </LayoutPanel>
  );
}
