import { Avatar } from "@astryxdesign/core/Avatar";
import { ChatMessage, ChatMessageBubble, ChatMessageMetadata, ChatSystemMessage, ChatToolCalls } from "@astryxdesign/core/Chat";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Text } from "@astryxdesign/core/Text";
import { TRACE } from "../../world";
import { LIVE_CALL } from "./data";
import { ArtifactCard } from "./panel";
import { messages, type Call, type Message, type Part } from "./turns";

const LANG = { run: "bash", edit: "typescript" } as const;

function toItem(c: Call) {
  const isEdit = c.tool === "edit";
  const plus = isEdit ? /\+(\d+)/.exec(c.out)?.[1] : undefined;
  const minus = isEdit ? /−(\d+)/.exec(c.out)?.[1] : undefined;
  return {
    key: `${c.at}-${c.tool}-${c.target}`,
    name: c.tool, target: c.target, duration: c.took,
    status: c.ok ? ("complete" as const) : ("error" as const),
    ...(c.ok ? {} : { errorMessage: c.out.split("\n").slice(-1)[0] }),
    ...(plus ? { additions: Number(plus) } : {}), ...(minus ? { deletions: Number(minus) } : {}),
    resultDetail: <CodeBlock code={isEdit ? TRACE.diff : c.out} language={LANG[c.tool as keyof typeof LANG] ?? "text"} isDiff={isEdit} maxHeight="50vh" />,
  };
}

function PartView({ part, onOpen }: { part: Part; onOpen: () => void }) {
  if (part.kind === "say") return <ChatMessageBubble variant="ghost">{part.text}</ChatMessageBubble>;
  if (part.kind === "think") {
    return (
      <Collapsible chevronPosition="start" defaultIsOpen={false} trigger={<Text type="supporting" color="secondary">Thinking</Text>}>
        <Text type="supporting" color="secondary">{part.text}</Text>
      </Collapsible>
    );
  }
  const edited = part.calls.some((c) => c.tool === "edit");
  return (
    <>
      <ChatToolCalls defaultIsExpanded calls={part.calls.map(toItem)} />
      {edited && <ArtifactCard onOpen={onOpen} />}
    </>
  );
}

function Said({ m, isLast, onOpen }: { m: Message; isLast: boolean; onOpen: () => void }) {
  return (
    <ChatMessage sender="assistant" avatar={<Avatar name={TRACE.role} size="md" />}>
      {m.parts.map((p, i) => <PartView key={i} part={p} onOpen={onOpen} />)}
      {isLast && <ChatToolCalls calls={[{ key: "live", name: LIVE_CALL.name, target: LIVE_CALL.target, status: "running" }]} />}
      <ChatMessageMetadata timestamp={m.at} />
    </ChatMessage>
  );
}

/** Read only: the brief from Coding, then what the thread said, thought and did. */
export function Transcript({ onOpen }: { onOpen: () => void }) {
  const ms = messages();
  return (
    <>
      <ChatSystemMessage variant="divider">{TRACE.started}</ChatSystemMessage>
      <ChatMessage sender="user">
        <ChatMessageBubble metadata={<ChatMessageMetadata timestamp="09:48" footer={<Text type="supporting" color="secondary">The brief, from {TRACE.manager}</Text>} />}>
          {TRACE.brief}
        </ChatMessageBubble>
      </ChatMessage>
      {ms.map((m, i) => <Said key={m.at + i} m={m} isLast={i === ms.length - 1} onOpen={onOpen} />)}
    </>
  );
}
