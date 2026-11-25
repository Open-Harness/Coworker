import { type ReactNode, useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Breadcrumbs, BreadcrumbItem } from "@astryxdesign/core/Breadcrumbs";
import {
  ChatComposer,
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatMessageMetadata,
  ChatToolCalls,
} from "@astryxdesign/core/Chat";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack, Layout, LayoutContent, LayoutHeader, VStack } from "@astryxdesign/core/Layout";
import { Markdown } from "@astryxdesign/core/Markdown";
import { Heading, Text } from "@astryxdesign/core/Text";
import type { ChatLineData, ChatScreenProps } from "../types.ts";
import { QuestionCards } from "./QuestionCards.tsx";
import { type Turn, turnsOf } from "./chat-turns.ts";

function ManagerTurn({ turn, managerName }: { readonly turn: Extract<Turn, { who: "manager" }>; readonly managerName: string }) {
  const isWriting = turn.parts.some((part) => part.kind === "words" && part.streaming === true);
  return (
    <ChatMessage
      sender="assistant"
      name={managerName}
      avatar={<Avatar name={managerName} size="sm" shape="rounded" tooltip={false} />}
      {...(isWriting ? { metadata: <ChatMessageMetadata footer="Writing…" /> } : {})}
    >
      <VStack gap={2}>
        {turn.parts.map((part) =>
          part.kind === "words" ? (
            <Markdown key={part.id} density="compact" headingLevelStart={2}>
              {part.text}
            </Markdown>
          ) : (
            <ChatToolCalls
              key={part.id}
              calls={part.actions.map(({ id, name, target, detail }) => ({
                key: id,
                name,
                ...(target === undefined ? {} : { target }),
                ...(detail === "" ? {} : { resultDetail: <CodeBlock code={detail} hasLanguageLabel={false} width="100%" isWrapped /> }),
              }))}
            />
          ),
        )}
      </VStack>
    </ChatMessage>
  );
}

function PersonTurn({ line }: { readonly line: ChatLineData }) {
  return (
    <ChatMessage sender="user">
      <ChatMessageBubble name={line.authorName ?? "Someone"}>
        <Markdown density="compact" headingLevelStart={2}>
          {line.text}
        </Markdown>
      </ChatMessageBubble>
    </ChatMessage>
  );
}

/** The workspace has no model. Someone who can connect one is shown where; anyone else, who to ask. */
function NoModel({ managerName, reason, fixHref }: { readonly managerName: string; readonly reason: string; readonly fixHref?: string }) {
  return fixHref === undefined ? (
    <Banner
      status="warning"
      container="section"
      title="No model is connected yet"
      description={`${managerName} cannot answer until one is. Ask an Owner of this workspace to connect one under Settings, Keys and connections.`}
    />
  ) : (
    <Banner
      status="warning"
      container="section"
      title="No model is connected"
      description={`${reason.replace(/^No model is connected\.\s*/u, "")} ${managerName} cannot answer until one is.`}
      endContent={<Button label="Add a model" variant="primary" href={fixHref} />}
    />
  );
}

/** A manager's chat: what people said, what it answered, and what it did. */
export function ChatScreen({ managerName, address, lines, failure, noModel, onSay, questions }: ChatScreenProps) {
  const [words, setWords] = useState("");
  const send = (text: string) => {
    if (text.trim() === "") return;
    onSay(text.trim());
    setWords("");
  };
  // The list shows its empty state only when it is given an empty array, not one that holds nothing.
  const rows: ReactNode[] = turnsOf(lines).map((turn) =>
    turn.who === "person" ? (
      <PersonTurn key={turn.id} line={turn.line} />
    ) : (
      <ManagerTurn key={turn.id} turn={turn} managerName={managerName} />
    ),
  );
  if (questions !== undefined && questions.items.length > 0)
    rows.push(<QuestionCards key="questions" workspaceId={questions.workspaceId} items={questions.items} />);
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader padding={4} hasDivider>
          <VStack gap={1}>
            <Breadcrumbs variant="supporting">
              <BreadcrumbItem>{managerName}</BreadcrumbItem>
              <BreadcrumbItem isCurrent>Chat</BreadcrumbItem>
            </Breadcrumbs>
            <HStack gap={3} vAlign="center" wrap="wrap">
              <Heading level={1}>Chat</Heading>
              <Text color="secondary">{`Or write to ${address}`}</Text>
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0}>
          <VStack height="100%">
            {noModel !== undefined && (
              <NoModel
                managerName={managerName}
                reason={noModel.reason}
                {...(noModel.fixHref === undefined ? {} : { fixHref: noModel.fixHref })}
              />
            )}
            <ChatLayout
              density="spacious"
              composer={
                <ChatComposer
                  value={words}
                  onChange={setWords}
                  onSubmit={send}
                  placeholder={`Ask ${managerName} for something`}
                  {...(failure === undefined ? {} : { status: { type: "error" as const, message: failure } })}
                />
              }
            >
              <ChatMessageList
                isStreaming={lines.at(-1)?.streaming === true}
                emptyState={<EmptyState title={`Say hello to ${managerName}`} description="Ask for work, or ask how something is going." />}
              >
                {rows}
              </ChatMessageList>
            </ChatLayout>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
