import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { ChatMessage } from "@astryxdesign/core/Chat";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { teamLinks } from "~/modules/team-core/service.ts";
import type { ItemData } from "../types.ts";

/** A question the manager asked, in the chat where it asked it, with the way to its Inbox item. */
export function QuestionCards({ workspaceId, items }: { readonly workspaceId: string; readonly items: readonly ItemData[] }) {
  return items.map(({ id, title, task, choices }) => (
    <ChatMessage key={id} sender="assistant" name="Question">
      <Card padding={4}>
        <VStack gap={2} hAlign="start">
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Badge variant="warning" label="Needs your answer" />
            {task !== undefined && <Badge label={task} />}
          </HStack>
          <Text weight="medium">{title}</Text>
          {choices.length > 0 && <Text type="supporting">{choices.map(({ label }) => label).join(" · ")}</Text>}
          <Button label="Answer in your Inbox" href={teamLinks.item(workspaceId, id)} aria-label={`Answer: ${title}`} />
        </VStack>
      </Card>
    </ChatMessage>
  ));
}
