import { useState } from "react";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Collapsible, CollapsibleGroup } from "@astryxdesign/core/Collapsible";
import { ChatSystemMessage } from "@astryxdesign/core/Chat";
import { Icon } from "@astryxdesign/core/Icon";
import { useLightbox } from "@astryxdesign/core/Lightbox";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Thumbnail } from "@astryxdesign/core/Thumbnail";
import { Token } from "@astryxdesign/core/Token";
import { PaperAirplaneIcon as SendIcon, PaperClipIcon as AttachIcon } from "@heroicons/react/24/outline";
import type { Attachment, Conversation, Draft, Message } from "./data.ts";
import { MESSAGE_MEASURE } from "./surface.ts";

/** The gap between a message's avatar and the name beside it, and the avatar's width, which the body's gutter matches. */
const THREAD_HEADER_GAP = 3;
const AVATAR_SIZE = 36;
const ThreadGutter = () => <VStack width={AVATAR_SIZE} />;

function AttachmentStrip({ attachments }: { attachments: Attachment[] }) {
  // Above the empty guard: a hook cannot sit behind an early return, and most messages have nothing attached.
  const lightbox = useLightbox({
    media: attachments.map((a) => ({ src: a.src, alt: `Attachment: ${a.name}`, caption: a.name })),
    hasZoom: true,
  });
  if (attachments.length === 0) return null;
  return (
    <VStack gap={2}>
      <HStack gap={1} vAlign="center">
        <Icon icon={AttachIcon} size="sm" color="gray" />
        <Text type="supporting" color="secondary">
          {attachments.length} attachment{attachments.length === 1 ? "" : "s"}
        </Text>
      </HStack>
      <HStack gap={2} wrap="wrap">
        {attachments.map((a, index) => (
          <Thumbnail key={a.id} src={a.src} alt={`Preview of ${a.name}`} label={a.name} onClick={() => lightbox.open(index)} />
        ))}
      </HStack>
      {lightbox.element}
    </VStack>
  );
}

/** A message's header line: who, what the line under the name says, and when. `tooltip={false}` keeps a second tab stop out of the trigger. */
function Who({ name, line, at, extra }: { name: string; line: string; at: string; extra?: React.ReactNode }) {
  return (
    <HStack gap={THREAD_HEADER_GAP} vAlign="center" paddingInlineEnd={2}>
      <Avatar name={name} tooltip={false} />
      <StackItem size="fill">
        <VStack gap={0.5}>
          <HStack gap={2} vAlign="center">
            <Text maxLines={1} weight="semibold">
              {name}
            </Text>
            {extra}
          </HStack>
          <Text maxLines={1} type="supporting" color="secondary">
            {line}
          </Text>
        </VStack>
      </StackItem>
      <StackItem size="static">
        <Text type="supporting" color="secondary" maxLines={1}>
          {at}
        </Text>
      </StackItem>
    </HStack>
  );
}

const Body = ({ children }: { children: React.ReactNode }) => (
  <HStack gap={THREAD_HEADER_GAP}>
    <ThreadGutter />
    <StackItem size="fill">
      <VStack gap={3} maxWidth={MESSAGE_MEASURE}>
        {children}
      </VStack>
    </StackItem>
  </HStack>
);

function MessageRow({ message }: { message: Message }) {
  return (
    <Collapsible value={message.id} trigger={<Who name={message.sender} line={message.from} at={message.at} />}>
      <Body>
        {message.body.map((p) => (
          <Text key={p}>{p}</Text>
        ))}
        <AttachmentStrip attachments={message.attachments ?? []} />
      </Body>
    </Collapsible>
  );
}

/** What Support has written and not sent: Send is the yes, Change opens it for editing. */
function DraftRow({ who, draft, onChange, onSend }: { who: string; draft: Draft; onChange: (text: string) => void; onSend: () => void }) {
  const [edit, setEdit] = useState<string | null>(null);
  return (
    <Collapsible
      value={draft.id}
      trigger={<Who name={who} line="Waits for your yes" at={draft.at} extra={<Token size="sm" label="Draft" />} />}
    >
      <Body>
        {edit === null ? (
          draft.body.map((p) => <Text key={p}>{p}</Text>)
        ) : (
          <TextArea label="Draft" isLabelHidden value={edit} onChange={setEdit} />
        )}
        <HStack gap={2}>
          {edit === null ? (
            <>
              <Button label="Send" variant="primary" icon={<Icon icon={SendIcon} size="sm" />} onClick={onSend} />
              <Button label="Change" variant="secondary" onClick={() => setEdit(draft.body.join("\n\n"))} />
            </>
          ) : (
            <>
              <Button
                label="Save"
                variant="primary"
                onClick={() => {
                  onChange(edit);
                  setEdit(null);
                }}
              />
              <Button label="Cancel" variant="ghost" onClick={() => setEdit(null)} />
            </>
          )}
        </HStack>
      </Body>
    </Collapsible>
  );
}

/** Everything in the conversation, oldest first: messages fold, system lines stay quiet between them. The newest message is open. */
export function ThreadHistory({
  who,
  conversation,
  onChangeDraft,
  onSendDraft,
}: {
  who: string;
  conversation: Conversation;
  onChangeDraft: (draftId: string, text: string) => void;
  onSendDraft: (draftId: string) => void;
}) {
  const newest = [...conversation.thread].reverse().find((t) => t.kind !== "note");
  return (
    <VStack gap={2}>
      {/* Remount per conversation: `defaultValue` is read once, so a different conversation is a different disclosure group. */}
      <CollapsibleGroup
        key={`${conversation.id}-${newest?.id}`}
        type="multiple"
        density="spacious"
        defaultValue={newest ? [newest.id] : []}
      >
        {conversation.thread.map((item) =>
          item.kind === "note" ? (
            <ChatSystemMessage key={item.id}>{item.text}</ChatSystemMessage>
          ) : item.kind === "draft" ? (
            <DraftRow
              key={item.id}
              who={who}
              draft={item}
              onChange={(t) => onChangeDraft(item.id, t)}
              onSend={() => onSendDraft(item.id)}
            />
          ) : (
            <MessageRow key={item.id} message={item} />
          ),
        )}
      </CollapsibleGroup>
    </VStack>
  );
}
