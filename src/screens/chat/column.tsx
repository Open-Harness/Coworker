// astryx-template: ai-chat
import { useRef, type CSSProperties } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import {
  ChatComposer,
  ChatComposerInput,
  ChatDictationButton,
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatMessageMetadata,
  ChatSystemMessage,
  ChatToolCalls,
  useChatDictation,
  type ChatComposerInputHandle,
} from "@astryxdesign/core/Chat";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack } from "@astryxdesign/core/Layout";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { useClock } from "~/modules/page/service.ts";
import type { ChatView } from "~/modules/views-workspace/types.ts";

type Line = ChatView["lines"][number];
type Fork = ChatView["forks"][number];

const fill: CSSProperties = { flex: 1, minHeight: 0 };
const wide: CSSProperties = { maxWidth: "100%", minWidth: 0 };

const callsOf = (line: Line) =>
  line.calls.map((call) => ({
    name: call.name,
    target: call.target,
    status: call.state === "running" ? ("running" as const) : ("complete" as const),
    ...(call.took === null ? {} : { duration: `${call.took.toFixed(1)} s` }),
  }));

function Message({ line, juno, fork, onFork }: { line: Line; juno: string; fork: Fork | undefined; onFork: (chat: string) => void }) {
  const clock = useClock();
  const isMine = line.by !== "coworker";
  return (
    <ChatMessage sender={isMine ? "user" : "assistant"} {...(isMine ? {} : { avatar: <Avatar name={juno} size="md" /> })}>
      {line.calls.length > 0 && <ChatToolCalls calls={callsOf(line)} />}
      <ChatMessageBubble
        {...(isMine ? {} : { variant: "ghost" as const })}
        metadata={<ChatMessageMetadata timestamp={clock.time(line.at)} />}
      >
        {line.text}
      </ChatMessageBubble>
      {fork && (
        <HStack paddingInlineStart={isMine ? 0 : 3}>
          <Button
            label={`${fork.title}, ${fork.replies} replies`}
            size="sm"
            variant="ghost"
            style={wide}
            icon={<Icon icon={ChatBubbleLeftRightIcon} size="sm" />}
            onClick={() => onFork(fork.id)}
          />
        </HStack>
      )}
    </ChatMessage>
  );
}

export interface ColumnProps {
  readonly lines: ChatView["lines"];
  /** A fork hangs under the line it was forked at: `knew` lines in. */
  readonly forks: ChatView["forks"];
  readonly note: string;
  readonly placeholder: string;
  readonly juno: string;
  readonly onFork: (chat: string) => void;
  readonly onSend: (text: string) => void;
}

/** The lines of one chat, and where to say the next. */
export function Column({ lines, forks, note, placeholder, juno, onFork, onSend }: ColumnProps) {
  const input = useRef<ChatComposerInputHandle>(null);
  const dictation = useChatDictation({ inputRef: input });
  return (
    <ChatLayout
      density="spacious"
      style={fill}
      composer={
        <ChatComposer
          onSubmit={onSend}
          placeholder={placeholder}
          input={<ChatComposerInput handleRef={input} />}
          sendActions={<ChatDictationButton dictation={dictation} />}
        />
      }
    >
      <ChatMessageList>
        <ChatSystemMessage variant="divider">{note}</ChatSystemMessage>
        {lines.map((line, index) => (
          <Message key={line.id} line={line} juno={juno} fork={forks.find((fork) => fork.knew === index + 1)} onFork={onFork} />
        ))}
      </ChatMessageList>
    </ChatLayout>
  );
}
