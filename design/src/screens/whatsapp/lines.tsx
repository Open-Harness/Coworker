import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { ChatMessage, ChatMessageBubble, ChatMessageList, ChatMessageMetadata, ChatSystemMessage } from "@astryxdesign/core/Chat";
import { HStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { Thumbnail } from "@astryxdesign/core/Thumbnail";
import type { Line, Msg } from "./types";

function Footer({ m, threadLabel, onThread }: { m: Msg; threadLabel?: string | undefined; onThread?: (() => void) | undefined }) {
  if (!m.by && !m.unsent && !threadLabel) return undefined;
  return (
    <HStack gap={2} vAlign="center" wrap="wrap">
      {m.unsent ? <Badge label="Not sent yet" variant="warning" /> : null}
      {m.by ? <Text type="supporting" color="secondary">{m.by}</Text> : null}
      {threadLabel && onThread ? <Button label={threadLabel} variant="ghost" size="sm" onClick={onThread} /> : null}
    </HStack>
  );
}

function MsgView({ m, threadLabel, onThread }: { m: Msg; threadLabel?: string | undefined; onThread?: (() => void) | undefined }) {
  const mine = m.side === "me";
  const name = !mine ? m.name : undefined;
  return (
    <ChatMessage sender={mine ? "user" : "assistant"} avatar={mine ? undefined : <Avatar name={m.name ?? ""} size="md" />}>
      {m.photo ? (
        <ChatMessageBubble variant="ghost" name={name}><Thumbnail label={m.photo} alt={m.photo} /></ChatMessageBubble>
      ) : null}
      <ChatMessageBubble
        name={m.photo ? undefined : name}
        metadata={<ChatMessageMetadata timestamp={m.time} footer={Footer({ m, threadLabel, onThread })} />}
      >
        {m.text}
      </ChatMessageBubble>
    </ChatMessage>
  );
}

/** The stream: people on the left, the manager on the right, quiet system lines between. */
export function Lines({ lines, threadLabel, onThread }: { lines: readonly Line[]; threadLabel?: (m: Msg) => string | undefined; onThread?: (m: Msg) => void }) {
  return (
    <ChatMessageList density="balanced">
      {lines.map((l) =>
        l.kind === "note" ? (
          <ChatSystemMessage key={l.id}>
            {l.text}{l.link ? <> <Link href={`#${l.link.to}`}>{l.link.label}</Link></> : null}
          </ChatSystemMessage>
        ) : (
          <MsgView key={l.id} m={l} threadLabel={threadLabel?.(l)} onThread={onThread ? () => onThread(l) : undefined} />
        ),
      )}
    </ChatMessageList>
  );
}
