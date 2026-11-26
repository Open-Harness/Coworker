// astryx-template: table-inbox
import { useEffect, useRef } from "react";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { Token } from "@astryxdesign/core/Token";
import { rtlStyles } from "@astryxdesign/core/utils";
import { ArrowLeftIcon, ArrowRightIcon, XMarkIcon as CloseIcon } from "@heroicons/react/24/outline";
import { useGo } from "~/modules/page/service.ts";
import type { Conversation } from "./data.ts";
import { actionsFor, type Act } from "./row-actions.ts";
import { ReplyBox } from "./replybox.tsx";
import { ThreadHistory } from "./thread.tsx";

export interface PaneActions {
  act: Act;
  onTell: (id: string, text: string) => void;
  onWrite: (id: string, text: string) => void;
  onHandBack: (id: string) => void;
  onChangeDraft: (id: string, draftId: string, text: string) => void;
  onSendDraft: (id: string, draftId: string) => void;
}

/** The work it became, and how it got here: only where the story has one. ACME-412 has its page and its thread. */
function Links({ conversation, manager }: { conversation: Conversation; manager: string }) {
  const go = useGo();
  const task = conversation.task;
  if (!task) return null;
  const thread = conversation.thread_;
  return (
    <HStack gap={1} vAlign="center" wrap="wrap">
      <Button
        label={task}
        variant="secondary"
        size="sm"
        icon={<Icon icon={ArrowRightIcon} size="sm" />}
        onClick={() => go(`/m/${manager}/work/${task}`)}
      />
      {thread ? <Button label="How it got here" variant="ghost" size="sm" onClick={() => go(`/m/${manager}/threads/${thread}`)} /> : null}
    </HStack>
  );
}

export function ConversationPane({
  conversation,
  manager,
  who,
  onClose,
  isFullWidth,
  ...pane
}: { conversation: Conversation; manager: string; who: string; onClose: () => void; isFullWidth: boolean } & PaneActions) {
  const threadActions = actionsFor(conversation).map((action) => (
    <IconButton
      key={action.id}
      variant="ghost"
      label={`${action.label}: ${conversation.subject}`}
      tooltip={action.label}
      icon={<Icon icon={action.icon} size="sm" />}
      onClick={() => pane.act(action.id, conversation.id)}
    />
  ));

  // After a send, show what was added: the end of the conversation. Opening one starts at the top, as the template does.
  const end = useRef<HTMLDivElement>(null);
  const seen = useRef({ id: conversation.id, length: conversation.thread.length });
  useEffect(() => {
    const was = seen.current;
    seen.current = { id: conversation.id, length: conversation.thread.length };
    if (was.id === conversation.id && conversation.thread.length > was.length) end.current?.scrollIntoView({ block: "end" });
  }, [conversation.id, conversation.thread.length]);

  return (
    <VStack height="100%">
      {/* Two headers: beside the list there is width for one line; full width the way out takes the top row and the subject drops beneath it. */}
      {isFullWidth ? (
        <>
          <Toolbar
            label="Conversation"
            startContent={
              <Button
                label="Inbox"
                variant="ghost"
                icon={<Icon icon={ArrowLeftIcon} size="sm" xstyle={rtlStyles.mirror} />}
                onClick={onClose}
              />
            }
            endContent={threadActions}
          />
          <VStack paddingBlockEnd={3}>
            <Heading level={3} accessibilityLevel={2} maxLines={2} hasTruncateTooltip>
              {conversation.subject}
            </Heading>
          </VStack>
        </>
      ) : (
        /* Uneven on purpose: the title has no side bearing, the close button carries its own, so 12 and 8 put both on the content line. */
        <VStack paddingBlockStart={4} paddingInlineStart={3} paddingInlineEnd={2}>
          <Toolbar
            label="Conversation"
            startContent={
              <Heading level={2} maxLines={2} hasTruncateTooltip>
                {conversation.subject}
              </Heading>
            }
            endContent={
              <>
                {threadActions}
                <IconButton
                  variant="ghost"
                  label="Close conversation"
                  tooltip="Close"
                  icon={<Icon icon={CloseIcon} size="sm" />}
                  onClick={onClose}
                />
              </>
            }
          />
        </VStack>
      )}

      <StackItem size="fill">
        <VStack
          paddingInline={isFullWidth ? 0 : 6}
          paddingBlockStart={0}
          paddingBlockEnd={isFullWidth ? 0 : 4}
          gap={4}
          isScrollable
          height="100%"
        >
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Text type="supporting" color="secondary">
              {conversation.sender}, {conversation.senderEmail}
            </Text>
          </HStack>
          <HStack gap={2} vAlign="center" wrap="wrap">
            {conversation.tags.map((tag) => (
              <Token key={tag} size="sm" label={tag} />
            ))}
            <Links conversation={conversation} manager={manager} />
            {conversation.owner ? (
              <HStack gap={1} vAlign="center">
                <Token size="sm" color="gray" label="Yours" />
                <Button label="Hand back" variant="secondary" size="sm" onClick={() => pane.onHandBack(conversation.id)} />
              </HStack>
            ) : null}
          </HStack>
          <ThreadHistory
            who={who}
            conversation={conversation}
            onChangeDraft={(d, t) => pane.onChangeDraft(conversation.id, d, t)}
            onSendDraft={(d) => pane.onSendDraft(conversation.id, d)}
          />
          <VStack ref={end} />
        </VStack>
      </StackItem>
      {/* Docked, not in the scroll: it is the one thing you do here, and it stays with the conversation you are reading. */}
      <ReplyBox
        who={who}
        key={conversation.id}
        first={conversation.sender.split(" ")[0] ?? conversation.sender}
        onTell={(t) => pane.onTell(conversation.id, t)}
        onWrite={(t) => pane.onWrite(conversation.id, t)}
      />
    </VStack>
  );
}
