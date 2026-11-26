import { Fragment } from "react";
import { ArrowUturnRightIcon } from "@heroicons/react/24/outline";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { ChatMessage, ChatMessageBubble, ChatMessageMetadata } from "@astryxdesign/core/Chat";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { HStack } from "@astryxdesign/core/Layout";
import { Icon } from "@astryxdesign/core/Icon";
import { Markdown } from "@astryxdesign/core/Markdown";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { DocumentRow } from "~/modules/protocol/types.ts";
import type { ToolCallView, TranscriptBlock } from "~/modules/transcript/types.ts";
import type { TranscriptProps } from "../types.ts";
import { CopyButton } from "./CopyButton.tsx";
import { DocumentCard } from "./DocumentCard.tsx";
import { ToolCalls } from "./ToolCalls.tsx";

/** Reasoning the model shared. Closed unless it is all there is so far. */
function Thinking({ text, isOpen }: { readonly text: string; readonly isOpen: boolean }) {
  return (
    <ChatMessageBubble variant="ghost">
      <Collapsible
        trigger={
          <Text type="supporting" color="secondary">
            Thinking
          </Text>
        }
        defaultIsOpen={isOpen}
      >
        <Text type="supporting" color="secondary">
          {text}
        </Text>
      </Collapsible>
    </ChatMessageBubble>
  );
}

interface DocumentMade {
  readonly documentId: string;
  readonly version: number;
}

/** Documents a call wrote, from what the tool reported. */
function documentMade({ status, details }: ToolCallView): DocumentMade | undefined {
  if (status !== "complete" || typeof details !== "object" || details === null) return undefined;
  if (!("documentId" in details) || !("version" in details)) return undefined;
  const { documentId, version } = details;
  return typeof documentId === "string" && typeof version === "number" ? { documentId, version } : undefined;
}

type MadeProps = Pick<TranscriptProps, "documents" | "onOpenDocument"> & { readonly calls: readonly ToolCallView[] };

function MadeDocuments({ calls, documents, onOpenDocument }: MadeProps) {
  const made = calls.flatMap((call) => {
    const found = documentMade(call);
    const row = documents.find(({ id }) => id === found?.documentId);
    return found === undefined || row === undefined ? [] : [{ ...found, row }];
  });
  return made.map(({ documentId, version, row }: DocumentMade & { readonly row: DocumentRow }) => (
    <ChatMessageBubble key={`${documentId} ${version}`} variant="ghost" width="100%">
      <DocumentCard title={row.title} language={row.language} version={version} onOpen={() => onOpenDocument(documentId, version)} />
    </ChatMessageBubble>
  ));
}

type AnswerBlock = Extract<TranscriptBlock, { readonly kind: "answer" }>;
type AnswerProps = Pick<TranscriptProps, "documents" | "onOpenDocument" | "onFork" | "agentName"> & {
  /** Everything said and done since the prompt: one part per round of tools. */
  readonly parts: readonly AnswerBlock[];
  /** The part being written now. */
  readonly streaming?: { readonly text: string; readonly thinking: string };
};

function AnswerText({ text, thinking, isStreaming }: { readonly text: string; readonly thinking: string; readonly isStreaming: boolean }) {
  return (
    <>
      {thinking !== "" && <Thinking text={thinking} isOpen={isStreaming && text === ""} />}
      {text !== "" && (
        <ChatMessageBubble variant="ghost">
          <Markdown density="compact" headingLevelStart={2} isStreaming={isStreaming}>
            {text}
          </Markdown>
        </ChatMessageBubble>
      )}
      {isStreaming && text === "" && (
        <ChatMessageBubble variant="ghost">
          <Spinner size="sm" aria-label="Thinking" />
        </ChatMessageBubble>
      )}
    </>
  );
}

function AnswerFooter({ last, text, onFork }: Pick<AnswerProps, "onFork"> & { readonly last: AnswerBlock; readonly text: string }) {
  return (
    <ChatMessageMetadata
      timestamp={<Timestamp value={last.at / 1000} format="time" />}
      {...(last.end === "failed" ? { status: "error" as const } : {})}
      footer={
        text === "" ? undefined : (
          <HStack gap={0.5} vAlign="center">
            {last.end === "stopped" && (
              <Text type="supporting" color="secondary">
                Stopped
              </Text>
            )}
            <CopyButton text={text} label="Copy answer" />
            <Button
              label="Continue in a new chat"
              variant="ghost"
              size="sm"
              icon={<Icon icon={ArrowUturnRightIcon} size="sm" />}
              isIconOnly
              onClick={() => onFork(last.id)}
            />
          </HStack>
        )
      }
    />
  );
}

/** One answer: what the assistant said and did, and the documents it wrote. */
export function Answer({ parts, streaming, documents, onOpenDocument, onFork, agentName }: AnswerProps) {
  const last = parts.at(-1);
  const text = parts
    .map((part) => part.text)
    .filter(Boolean)
    .join("\n\n");
  return (
    <ChatMessage
      sender="assistant"
      avatar={<Avatar name={agentName ?? "Assistant"} size="md" />}
      {...(agentName === undefined ? {} : { name: agentName })}
      metadata={last !== undefined && streaming === undefined && <AnswerFooter last={last} text={text} onFork={onFork} />}
    >
      {parts.map((part) => (
        <Fragment key={part.id}>
          <AnswerText text={part.text} thinking={part.thinking} isStreaming={false} />
          {part.calls.length > 0 && <ToolCalls calls={part.calls} />}
          <MadeDocuments calls={part.calls} documents={documents} onOpenDocument={onOpenDocument} />
        </Fragment>
      ))}
      {streaming !== undefined && <AnswerText {...streaming} isStreaming />}
    </ChatMessage>
  );
}
