import { Avatar } from "@astryxdesign/core/Avatar";
import { ChatMessage, ChatMessageList, ChatMessageMetadata, ChatToolCalls } from "@astryxdesign/core/Chat";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { VStack } from "@astryxdesign/core/Layout";
import { Markdown } from "@astryxdesign/core/Markdown";
import { Text } from "@astryxdesign/core/Text";
import type { RunData } from "../types.ts";
import { type Turn, turnsOf } from "./run-turns.ts";

/** What the run was asked, folded away on request. */
function Brief({ text }: { readonly text: string }) {
  return (
    <ChatMessage sender="system">
      <Collapsible chevronPosition="start" trigger={<Text weight="semibold">Brief</Text>}>
        <Markdown density="compact" headingLevelStart={3}>
          {text}
        </Markdown>
      </Collapsible>
    </ChatMessage>
  );
}

/** The agent's words and the steps it took, in the order it did them. */
function AgentTurn({ turn, agent }: { readonly turn: Extract<Turn, { kind: "agent" }>; readonly agent: string }) {
  const isWriting = turn.parts.some((part) => part.kind === "words" && part.isStreaming);
  return (
    <ChatMessage
      sender="assistant"
      name={agent}
      avatar={<Avatar name={agent} size="sm" shape="rounded" tooltip={false} />}
      {...(isWriting ? { metadata: <ChatMessageMetadata footer="Writing…" /> } : {})}
    >
      <VStack gap={2}>
        {turn.parts.map((part) =>
          part.kind === "words" ? (
            <Markdown key={part.id} density="compact" headingLevelStart={3}>
              {part.text}
            </Markdown>
          ) : (
            <ChatToolCalls key={part.id} defaultIsExpanded calls={part.steps.map(({ id, text }) => ({ key: id, name: text }))} />
          ),
        )}
      </VStack>
    </ChatMessage>
  );
}

/** What a run was asked, what it did and said, oldest first. The words being written now are last, and grow. */
export function RunLines({ run }: { readonly run: RunData }) {
  if (run.lines.length === 0)
    return (
      <EmptyState
        title="Nothing written yet"
        description={run.state === "ended" ? "This run left no transcript." : "Its words and steps show up here as it works."}
        isCompact
      />
    );
  return (
    <ChatMessageList align="top" isStreaming={run.lines.some(({ streaming }) => streaming === true)}>
      {turnsOf(run.lines).map((turn) =>
        turn.kind === "brief" ? <Brief key={turn.id} text={turn.text} /> : <AgentTurn key={turn.id} turn={turn} agent={run.agent} />,
      )}
    </ChatMessageList>
  );
}
