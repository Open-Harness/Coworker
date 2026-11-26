import { Avatar } from "@astryxdesign/core/Avatar";
import { Card } from "@astryxdesign/core/Card";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Divider } from "@astryxdesign/core/Divider";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { ChatBubbleLeftRightIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import type { Entry, Thread } from "./data.ts";

/** Who a comment is by, and for Juno what it is: Coding's, or a person's written as Juno. */
function Byline({ by, at, as, who, managerName }: { by: string; at: string; as?: string | undefined; who: string; managerName: string }) {
  return (
    <HStack gap={2} vAlign="center" wrap="wrap">
      <Text type="label" weight="semibold">
        {by}
      </Text>
      {by === who ? <Token size="sm" color="gray" label={as ?? managerName} /> : null}
      <Text type="supporting" color="secondary">
        {at}
      </Text>
    </HStack>
  );
}

function Comment({
  by,
  at,
  body,
  as,
  who,
  managerName,
}: {
  by: string;
  at: string;
  body: readonly string[];
  as?: string | undefined;
  who: string;
  managerName: string;
}) {
  return (
    <HStack gap={3} vAlign="start">
      <Avatar name={by} size="sm" tooltip={false} />
      <StackItem size="fill">
        <Card padding={3}>
          <VStack gap={2}>
            <Byline by={by} at={at} as={as} who={who} managerName={managerName} />
            {body.map((p) => (
              <Text key={p}>{p}</Text>
            ))}
          </VStack>
        </Card>
      </StackItem>
    </HStack>
  );
}

/** One review comment on a line, with the lines of the diff it is on and the talk under it. */
export function ThreadCard({ t, who, managerName }: { t: Thread; who: string; managerName: string }) {
  return (
    <Card padding={0} variant="muted">
      <VStack gap={0}>
        <HStack gap={2} vAlign="center" wrap="wrap" paddingInline={3} paddingBlock={2}>
          <StackItem size="fill">
            <Text type="supporting" weight="semibold" maxLines={1}>
              {t.file}:{t.line}
            </Text>
          </StackItem>
          {t.answered ? (
            <HStack gap={1} vAlign="center">
              <Icon icon={CheckCircleIcon} size="sm" color="gray" />
              <Text type="supporting" color="secondary">
                Answered
              </Text>
            </HStack>
          ) : (
            <Token size="sm" color="yellow" label="Open" />
          )}
        </HStack>
        <CodeBlock
          code={t.hunk}
          language="ts"
          isDiff
          hasLanguageLabel={false}
          size="sm"
          width="100%"
          startLineNumber={t.line - 3}
          hasLineNumbers
        />
        <VStack gap={3} padding={3}>
          {t.comments.map((c) => (
            <HStack key={c.at + c.by} gap={2} vAlign="start">
              <Avatar name={c.by} size="sm" tooltip={false} />
              <StackItem size="fill">
                <VStack gap={0.5}>
                  <Byline by={c.by} at={c.at} who={who} managerName={managerName} />
                  <Text>{c.body}</Text>
                </VStack>
              </StackItem>
            </HStack>
          ))}
        </VStack>
      </VStack>
    </Card>
  );
}

/** The conversation, in the order GitHub lists it. A note a person told Coding is a quiet line only we see. */
export function Timeline({
  entries,
  threads,
  who,
  managerName,
}: {
  entries: readonly Entry[];
  threads: readonly Thread[];
  who: string;
  managerName: string;
}) {
  return (
    <VStack gap={4}>
      {entries.map((e) => {
        if (e.kind === "comment")
          return <Comment key={e.id} by={e.by} at={e.at} body={e.body} as={e.as} who={who} managerName={managerName} />;
        if (e.kind === "event")
          return (
            <HStack key={e.id} gap={2} vAlign="center" paddingInlineStart={1}>
              <Icon icon={ChatBubbleLeftRightIcon} size="sm" color="gray" />
              <Text type="supporting" color="secondary">
                {e.text} {e.at}
              </Text>
            </HStack>
          );
        return (
          <VStack key={e.id} gap={2}>
            <Comment by={e.by} at={`${e.at}, ${e.verdict}`} body={[e.body]} who={who} managerName={managerName} />
            <VStack gap={2} paddingInlineStart={8}>
              {e.threads.map((id) => {
                const t = threads.find((x) => x.id === id);
                return t ? <ThreadCard key={id} t={t} who={who} managerName={managerName} /> : null;
              })}
            </VStack>
          </VStack>
        );
      })}
      <Divider />
    </VStack>
  );
}
