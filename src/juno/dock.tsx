// astryx-template: ai-chat
import { useRef, useState, type CSSProperties } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import {
  ChatComposer,
  ChatComposerInput,
  ChatDictationButton,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  useChatDictation,
  type ChatComposerInputHandle,
} from "@astryxdesign/core/Chat";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Reading, useApi, useBrowser, useRefresh } from "~/modules/page/service.ts";
import type { ChatView } from "~/modules/views-workspace/types.ts";
import { useShow } from "./walk/show.tsx";

/* The co-worker on any page: say what you want where you are, and it answers beside what you are looking at, and can show you how. */

const dock: CSSProperties = {
  position: "fixed",
  right: 16,
  bottom: 16,
  width: 300,
  zIndex: 900,
};
const lines: CSSProperties = { maxHeight: "40vh", overflow: "auto" };

type Line = ChatView["lines"][number];

function Reply({ line, name }: { readonly line: Line; readonly name: string }) {
  const show = useShow();
  const isMine = line.by !== "coworker";
  return (
    <ChatMessage sender={isMine ? "user" : "assistant"} {...(isMine ? {} : { avatar: <Avatar name={name} size="sm" /> })}>
      <ChatMessageBubble {...(isMine ? {} : { variant: "ghost" as const })}>{line.text}</ChatMessageBubble>
      {line.did.map(({ doing, says, showMe }) =>
        showMe === undefined ? (
          <Text key={doing} type="supporting" color="secondary">{`${says}`}</Text>
        ) : (
          <HStack key={doing} gap={2} vAlign="center" wrap="wrap">
            <Text type="supporting" color="secondary">
              {says}
            </Text>
            <Button label="Show me" size="sm" variant="secondary" onClick={() => show(showMe.doing, showMe.values)} />
          </HStack>
        ),
      )}
    </ChatMessage>
  );
}

function Said({ chat, name }: { readonly chat: string; readonly name: string }) {
  return (
    <Reading from="/chats/:chat" parts={{ chat }} failed="We could not read the chat">
      {(view) => (
        <VStack style={lines}>
          <ChatMessageList>
            {view.lines.map((line) => (
              <Reply key={line.id} line={line} name={name} />
            ))}
          </ChatMessageList>
        </VStack>
      )}
    </Reading>
  );
}

interface Props {
  readonly name: string;
  /** Where the person is, which the co-worker is told. */
  readonly path: string;
}

export function Dock({ name, path }: Props) {
  const [chat, setChat] = useState<string | null>(null);
  const [isSending, setSending] = useState(false);
  const [api, refresh, { newId }] = [useApi(), useRefresh(), useBrowser()];
  const input = useRef<ChatComposerInputHandle>(null);
  const dictation = useChatDictation({ inputRef: input });
  const isPhone = useMediaQuery("(max-width: 700px)");
  const send = async (text: string) => {
    setSending(true);
    const key = newId();
    const sent =
      chat === null
        ? await api.write("/chats", { text, key, place: path })
        : await api.write("/chats/:chat", { text, key, place: path }, { chat });
    setSending(false);
    if (sent._tag !== "Ok") return;
    const id = chat ?? ("chat" in sent.value ? sent.value.chat : null);
    setChat(id);
    refresh(["/chats", "/shell", ...(id === null ? [] : [`/chats/${id}`])]);
  };
  // On a phone it would cover what is read: there the co-worker is spoken with from Home, and from the palette.
  if (isPhone) return null;
  return (
    <Card padding={0} variant="transparent" aria-label={`Talk to ${name}`} style={dock}>
      <VStack gap={2}>
        {chat !== null && <Said chat={chat} name={name} />}
        {isSending && <Text type="supporting" color="secondary" role="status">{`${name} is on it`}</Text>}
        <ChatComposer
          onSubmit={(text: string) => void send(text)}
          placeholder="Tell Juno, or say it"
          input={<ChatComposerInput handleRef={input} />}
          sendActions={<ChatDictationButton dictation={dictation} />}
        />
      </VStack>
    </Card>
  );
}
