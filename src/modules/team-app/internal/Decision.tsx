import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { PageSection } from "~/modules/ui/service.ts";
import type { ItemData, Reply } from "../types.ts";
import { hrefOf } from "./AboutThis.tsx";
import { Options } from "./Options.tsx";

export const KIND = { approval: "Approval", question: "Question", notice: "Notice" } as const;

/** Who asked, and what it blocks, as badges. */
export function ItemBadges({ item }: { readonly item: ItemData }) {
  return (
    <HStack gap={3} wrap="wrap">
      <Badge variant={item.kind === "notice" ? "neutral" : "warning"} label={item.kind === "approval" ? "Ask" : KIND[item.kind]} />
      <Badge label={item.managerName} />
      {item.task !== undefined && <Badge label={`Blocks ${item.task}`} />}
    </HStack>
  );
}

/** What was answered, once it was. */
export function Answered({ item }: { readonly item: ItemData }) {
  if (item.answer === undefined) return null;
  return (
    <Banner
      status="success"
      container="section"
      title={`${item.answer.byName || "You"} answered: ${item.answer.text}`}
      {...(item.managerId === "" ? {} : { description: "The manager carries on from there." })}
    />
  );
}

/** The decision, what the manager knows, and the options with the box for an answer: shared by the Needs-you page and the Inbox's reading pane. */
export function Decision({
  workspaceId,
  item,
  onReply,
}: {
  readonly workspaceId: string;
  readonly item: ItemData;
  readonly onReply: (reply: Reply) => Promise<void>;
}) {
  return (
    <VStack gap={8}>
      <PageSection title={item.kind === "notice" ? "What happened" : "What you're deciding"}>
        <Text>{item.context ?? item.title}</Text>
      </PageSection>
      {item.facts.length > 0 && (
        <PageSection title="What the manager knows">
          <List hasDividers edge="flush">
            {item.facts.map(({ text, source }) => {
              const href = source === undefined ? undefined : hrefOf(workspaceId, item, source);
              return (
                <ListItem
                  key={text}
                  label={text}
                  {...(source === undefined ? {} : { description: `Source: ${source.title}` })}
                  {...(href === undefined ? {} : { href })}
                />
              );
            })}
          </List>
        </PageSection>
      )}
      {item.kind !== "notice" && (
        <PageSection title={item.choices.length === 0 ? "Your answer" : "Options"}>
          <Options item={item} onReply={onReply} />
        </PageSection>
      )}
    </VStack>
  );
}
