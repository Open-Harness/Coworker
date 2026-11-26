import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import {
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatMessageMetadata,
  ChatSystemMessage,
  ChatTokenizedText,
} from "@astryxdesign/core/Chat";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { DocumentRow } from "~/modules/protocol/types.ts";
import type { TranscriptBlock } from "~/modules/transcript/types.ts";
import type { TranscriptProps } from "../types.ts";
import { Answer } from "./Answer.tsx";
import { documentToken } from "./document-token.ts";
import { type AnswerBlock, rowKey, transcriptRows } from "./rows.ts";

type PromptBlock = Extract<TranscriptBlock, { readonly kind: "prompt" }>;

interface PromptProps {
  readonly block: PromptBlock;
  readonly isMine: boolean;
  readonly documents: readonly DocumentRow[];
}

/** What a person wrote. Mine are on my side; another person's carry their name and face. */
function Prompt({ block, isMine, documents }: PromptProps) {
  const { author, text, at } = block;
  return (
    <ChatMessage sender="user" {...(isMine ? {} : { name: author.name, avatar: <Avatar name={author.name} size="md" /> })}>
      <ChatMessageBubble metadata={<ChatMessageMetadata timestamp={<Timestamp value={at / 1000} format="time" />} />}>
        <ChatTokenizedText tokens={documents.map(({ title }) => documentToken(title))}>{text}</ChatTokenizedText>
      </ChatMessageBubble>
    </ChatMessage>
  );
}

function Block({ block, ...props }: TranscriptProps & { readonly block: Exclude<TranscriptBlock, AnswerBlock> }) {
  switch (block.kind) {
    case "earlier":
      return <ChatSystemMessage>Scroll up for earlier messages</ChatSystemMessage>;
    case "gap":
      return (
        <ChatSystemMessage>
          <Button label="Load the messages in between" size="sm" onClick={() => props.onFillGap(block.gap)} />
        </ChatSystemMessage>
      );
    case "prompt":
      return <Prompt block={block} isMine={block.author.id === props.me.id} documents={props.documents} />;
    case "scheduled":
      return <ChatSystemMessage>{`Scheduled: ${block.instruction}`}</ChatSystemMessage>;
    case "notice":
      return (
        <ChatSystemMessage variant="divider">
          {block.notice === "compaction" ? "Earlier messages were summarized for the assistant" : "The context was reset"}
        </ChatSystemMessage>
      );
  }
}

function Ending({ view, onContinue }: Pick<TranscriptProps, "view" | "onContinue">) {
  const { failure, retry, compacting, running } = view;
  if (retry !== undefined) {
    return <ChatSystemMessage>{`The model did not answer (${retry.error}). Trying again…`}</ChatSystemMessage>;
  }
  if (compacting) return <ChatSystemMessage>Summarizing earlier messages…</ChatSystemMessage>;
  if (failure === undefined || running) return null;
  return (
    <Banner
      status={failure.stopped ? "info" : "error"}
      title={failure.message}
      endContent={failure.canContinue ? <Button label="Continue" size="sm" onClick={onContinue} /> : undefined}
    />
  );
}

/** A whole conversation, newest at the bottom. */
export function Transcript(props: TranscriptProps) {
  const { view, onLoadEarlier } = props;
  const hasEarlier = view.blocks[0]?.kind === "earlier";
  return (
    <ChatMessageList isStreaming={view.running} {...(hasEarlier ? { scrollToTopAction: onLoadEarlier } : {})}>
      {transcriptRows(view).map((row) =>
        row.kind === "answer" ? (
          <Answer key={rowKey(row)} parts={row.parts} {...(row.streaming === undefined ? {} : { streaming: row.streaming })} {...props} />
        ) : (
          <Block key={rowKey(row)} {...props} block={row.block} />
        ),
      )}
      <Ending view={view} onContinue={props.onContinue} />
    </ChatMessageList>
  );
}
