import { useCallback, useState } from "react";
import { InboxIcon } from "@heroicons/react/24/outline";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent, LayoutHeader, VStack } from "@astryxdesign/core/Layout";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Load, useLoading, useNarrow } from "~/modules/team-core/service.ts";
import type { InboxScreenProps, ItemData } from "../types.ts";
import { useTeamApi } from "./context.ts";
import { InboxPane } from "./InboxPane.tsx";
import { InboxTable } from "./InboxTable.tsx";
import { useAnswer } from "./use-answer.ts";

const REFRESH_MS = 5_000;

/** Waiting on this person first; what they or someone else answered, and notices, are done. */
const split = (items: readonly ItemData[]) => {
  const newest = items.toSorted((a, b) => b.createdAt - a.createdAt);
  const waiting = newest.filter(({ answer, kind }) => answer === undefined && kind !== "notice");
  return { waiting, done: newest.filter((item) => !waiting.includes(item)) };
};

/** What waits for this person, newest first, then what they or someone else already answered. A row opens in a reading pane beside the list. */
export function InboxScreen({ workspaceId, items, onReply, failure }: InboxScreenProps) {
  const { waiting, done } = split(items);
  const [tab, setTab] = useState<"waiting" | "done">("waiting");
  const [chosen, setChosen] = useState<string>();
  const isNarrow = useNarrow();
  const isCompact = useMediaQuery("(max-width: 1180px)");
  const shown = tab === "waiting" ? waiting : done;
  // An answered item stays open in the pane, banner and all, though its row has moved to Done.
  const open = items.find(({ id }) => id === chosen) ?? shown[0];
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader padding={0}>
          <VStack>
            <VStack gap={1} padding={4}>
              <Heading level={1}>Inbox</Heading>
              <Text color="secondary">Questions and approvals your managers cannot settle alone.</Text>
            </VStack>
            <VStack paddingInline={1}>
              <TabList
                hasDivider
                value={tab}
                onChange={(value) => {
                  setTab(value === "done" ? "done" : "waiting");
                  setChosen(undefined);
                }}
              >
                <Tab
                  value="waiting"
                  label="Waiting on you"
                  endContent={waiting.length === 0 ? undefined : <Badge variant="neutral" label={String(waiting.length)} />}
                />
                <Tab value="done" label="Done" />
              </TabList>
            </VStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={4} isScrollable>
          <VStack gap={3}>
            {failure !== undefined && <Banner status="error" container="section" title="Your answer was not sent" description={failure} />}
            {shown.length === 0 ? (
              <EmptyState
                title={tab === "waiting" ? "Nothing waits for you" : "Nothing answered yet"}
                description={tab === "waiting" ? "Managers carry on until they need a person." : "What you answer shows here."}
                icon={<Icon icon={InboxIcon} size="lg" />}
              />
            ) : (
              <InboxTable
                workspaceId={workspaceId}
                items={shown}
                {...(open === undefined ? {} : { openId: open.id })}
                onOpen={setChosen}
                isNarrow={isNarrow}
                isCompact={isCompact}
              />
            )}
          </VStack>
        </LayoutContent>
      }
      end={
        isNarrow || open === undefined ? undefined : (
          <InboxPane workspaceId={workspaceId} item={open} onReply={(reply) => onReply(open.id, reply)} />
        )
      }
    />
  );
}

/** Loads the Inbox and keeps it fresh while it is open; an answer given in the pane replaces its row at once. */
export function InboxPage({ workspaceId }: { readonly workspaceId: string }) {
  const api = useTeamApi();
  const { loaded, show } = useLoading(
    useCallback(() => api.inbox(workspaceId), [api, workspaceId]),
    REFRESH_MS,
  );
  const { failure, send } = useAnswer(workspaceId, (answered) => {
    if (loaded?._tag === "Loaded") show(loaded.value.map((item) => (item.id === answered.id ? answered : item)));
  });
  return (
    <Load loaded={loaded} failedTitle="The Inbox did not load">
      {(items) => <InboxScreen workspaceId={workspaceId} items={items} onReply={send} {...(failure === undefined ? {} : { failure })} />}
    </Load>
  );
}
