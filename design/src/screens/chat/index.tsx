// astryx-template: ai-chat
import { useRef, type CSSProperties } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { ChatComposer, ChatComposerInput, ChatDictationButton, ChatLayout, ChatMessage, ChatMessageBubble, ChatMessageList, ChatMessageMetadata, ChatSystemMessage, ChatToolCalls, useChatDictation, type ChatComposerInputHandle } from "@astryxdesign/core/Chat";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import { Text } from "@astryxdesign/core/Text";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { ArrowTopRightOnSquareIcon, ChatBubbleLeftRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { JUNO } from "../../juno/world";
import { go } from "../../shell";
import { FORK, MAIN, type Msg } from "./data";

const column: CSSProperties = { flex: 1, width: "100%", minWidth: 0, height: "100%" };
const fill: CSSProperties = { flex: 1, minHeight: 0 };
const panel: CSSProperties = { overflow: "hidden", display: "flex", flexDirection: "column", flexShrink: 0 };
const isFork = () => location.hash === "#chat-support-october";

function Line({ m }: { m: Msg }) {
  const fork = m.fork;
  return (
    <ChatMessage sender={m.me ? "user" : "assistant"} {...(m.me ? {} : { avatar: <Avatar name={JUNO.name} size="md" /> })}>
      {m.calls && <ChatToolCalls calls={m.calls.map((c) => ({ ...c }))} />}
      <ChatMessageBubble {...(m.me ? {} : { variant: "ghost" as const })} metadata={<ChatMessageMetadata timestamp={m.at} />}>{m.text}</ChatMessageBubble>
      {fork && <HStack paddingInlineStart={m.me ? 0 : 3}><Button label={fork.label} size="sm" variant="ghost" style={{ maxWidth: "100%", minWidth: 0 }} icon={<Icon icon={ChatBubbleLeftRightIcon} size="sm" />} onClick={() => go(fork.to)} /></HStack>}
    </ChatMessage>
  );
}

function Column({ messages, note, placeholder }: { messages: readonly Msg[]; note: string; placeholder: string }) {
  const input = useRef<ChatComposerInputHandle>(null);
  const dictation = useChatDictation({ inputRef: input });
  return (
    <ChatLayout density="spacious" style={fill} composer={<ChatComposer onSubmit={() => undefined} placeholder={placeholder} input={<ChatComposerInput handleRef={input} />} sendActions={<ChatDictationButton dictation={dictation} />} />}>
      <ChatMessageList>
        <ChatSystemMessage variant="divider">{note}</ChatSystemMessage>
        {messages.map((m) => <Line key={m.at + m.text} m={m} />)}
      </ChatMessageList>
    </ChatLayout>
  );
}

/** A chat with Juno, and the one forked from it beside it. A fork is a chat of its own: it knows what was above, and nothing after. */
export default function Chat() {
  const isNarrow = useMediaQuery("(max-width: 1000px)");
  const size = useResizable({ defaultSize: 520, minSize: 360, maxSize: 800, autoSaveId: "juno-fork" });
  const isOpen = isFork();
  const fork = (
    <>
      <Toolbar label="Forked chat" dividers={["bottom"]}
        startContent={<HStack gap={3} vAlign="center"><Icon icon={ChatBubbleLeftRightIcon} size="sm" color="secondary" /><VStack gap={0}><Text type="label" weight="semibold">Compare with October</Text><Text type="supporting" color="secondary">Forked at 09:31, knew 6 messages</Text></VStack></HStack>}
        endContent={<><IconButton label="Open on its own" variant="ghost" size="sm" icon={<Icon icon={ArrowTopRightOnSquareIcon} size="sm" />} onClick={() => go("soon-Chat")} /><IconButton label="Close" variant="ghost" size="sm" icon={<Icon icon={XMarkIcon} size="sm" />} onClick={() => go("chat-support")} /></>} />
      <Column messages={FORK} note="Forked from Why is Support slower?" placeholder="Ask in this fork" />
    </>
  );
  return (
    <VStack height="100%">
      <Layout height="fill"
        content={
          <LayoutContent role="main" padding={0}>
            <VisuallyHidden as="h1">Why is Support slower?</VisuallyHidden>
            <HStack height="100%">
              {isNarrow && isOpen ? <VStack style={column}>{fork}</VStack> : (
                <>
                  <VStack style={column}><Column messages={MAIN} note="Today" placeholder="Tell Juno, or say it" /></VStack>
                  {isOpen && (
                    <>
                      <ResizeHandle direction="horizontal" resizable={size.props} isReversed pillPlacement="start" hasDivider label="Resize the fork" />
                      <Card variant="transparent" padding={0} height="100%" style={{ ...panel, width: size.size }}>{fork}</Card>
                    </>
                  )}
                </>
              )}
            </HStack>
          </LayoutContent>
        }
      />
    </VStack>
  );
}
