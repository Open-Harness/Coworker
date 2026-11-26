import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { ChatComposer, ChatComposerInput, ChatDictationButton, ChatLayout, ChatMessage, ChatMessageBubble, ChatMessageList, ChatMessageMetadata, ChatSystemMessage, ChatToolCalls, useChatDictation, type ChatComposerInputHandle } from "@astryxdesign/core/Chat";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { ChevronRightIcon, WindowIcon } from "@heroicons/react/24/outline";
import { useRef, type CSSProperties } from "react";
import { JUNO } from "../../juno/world";
import type { Walk } from "./use-walk";
import { CHANGES, STEPS } from "./walk";

const fill: CSSProperties = { flex: 1, minHeight: 0 };

/** The chat beside it: what was asked, every action as it happens, and what to do when it is done. */
export function Talk({ w, onWatch, isWatching }: { w: Walk; onWatch: () => void; isWatching: boolean }) {
  const input = useRef<ChatComposerInputHandle>(null);
  const dictation = useChatDictation({ inputRef: input });
  const isHand = w.mode === "hand"; const isDone = w.mode === "done" || (isHand && w.draft.saved);
  const calls = STEPS.slice(0, w.n + 1).flatMap((s, i) => s.call === "press" || s.call === "point" ? [] : [{ key: `${i}`, name: s.call, target: s.on, status: i < w.n || isDone ? ("complete" as const) : ("running" as const) }]);
  return (
    <ChatLayout density="spacious" style={fill}
      composer={<ChatComposer onSubmit={() => undefined} placeholder="Tell Juno, or say it" input={<ChatComposerInput handleRef={input} />} sendActions={<ChatDictationButton dictation={dictation} />} />}>
      <ChatMessageList>
        <ChatSystemMessage variant="divider">Today</ChatSystemMessage>
        <ChatMessage sender="user">
          <ChatMessageBubble metadata={<ChatMessageMetadata timestamp="09:52" />}>Bo is away on Mondays until Christmas. Don’t look for signs then.</ChatMessageBubble>
        </ChatMessage>
        <ChatMessage sender="assistant" avatar={<Avatar name={JUNO.name} size="md" />}>
          <ChatMessageBubble variant="ghost">Yes. I’ll change when Look for signs runs, on the screen so you see where it lives. Stop me any time.</ChatMessageBubble>
          {!isHand && <ChatToolCalls calls={calls} defaultIsExpanded label={`${calls.length} actions`} />}
          <ChatMessageBubble variant="ghost" width="100%" metadata={<ChatMessageMetadata timestamp="09:53" />}>
            <ClickableCard label="Watch Juno change the trigger" onClick={onWatch} variant="muted" padding={3} maxWidth={360}>
              <HStack gap={3} vAlign="center" width="100%">
                <Icon icon={WindowIcon} size="md" color="secondary" />
                <StackItem size="fill"><VStack gap={0}><Text type="label" weight="semibold">Look for signs, Sales</Text><Text type="supporting" color="secondary">{isDone ? "Done" : isWatching ? "Beside this chat" : "Watch"}</Text></VStack></StackItem>
                <Icon icon={ChevronRightIcon} size="sm" color="secondary" />
              </HStack>
            </ClickableCard>
          </ChatMessageBubble>
        </ChatMessage>
        {w.mode === "yours" && (
          <ChatMessage sender="assistant" avatar={<Avatar name={JUNO.name} size="md" />}>
            <ChatMessageBubble variant="ghost">{`Save this as version 7? ${CHANGES}`}</ChatMessageBubble>
            <HStack gap={2} wrap="wrap" vAlign="center" paddingInlineStart={3}><Badge variant="warning" label="Waits for you" /><Button label="Save" size="sm" variant="primary" onClick={() => w.answer(true)} /><Button label="Not yet" size="sm" variant="secondary" onClick={() => w.answer(false)} /></HStack>
          </ChatMessage>
        )}
        {isDone && (
          <ChatMessage sender="assistant" avatar={<Avatar name={JUNO.name} size="md" />}>
            <ChatMessageBubble variant="ghost">{w.draft.saved ? "Version 7 is saved. Mondays come back on 4 January, I put that in. By hand it is Sales, Playbook, Triggers, the pencil. Tell me if you want it different." : "Not saved. The change is on the page, and nothing has changed for Sales. By hand it is Sales, Playbook, Triggers, the pencil."}</ChatMessageBubble>
            <HStack gap={2} wrap="wrap" paddingInlineStart={3}>
              <Button label="Let me try" size="sm" variant="secondary" onClick={w.tryIt} /><Button label="Show me again" size="sm" variant="ghost" onClick={w.again} /><Button label="Undo" size="sm" variant="ghost" onClick={w.undo} />
            </HStack>
          </ChatMessage>
        )}
        {isHand && !isDone && (
          <ChatMessage sender="assistant" avatar={<Avatar name={JUNO.name} size="md" />}><ChatMessageBubble variant="ghost">You have it. I point at what comes next, and I don’t touch anything.</ChatMessageBubble></ChatMessage>
        )}
      </ChatMessageList>
    </ChatLayout>
  );
}
