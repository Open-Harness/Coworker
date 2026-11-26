// astryx-template: ai-chat
import { Avatar } from "@astryxdesign/core/Avatar";
import { ChatMessage, ChatMessageBubble, ChatMessageMetadata, ChatSystemMessage, ChatToolCalls } from "@astryxdesign/core/Chat";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Text } from "@astryxdesign/core/Text";
import type { ThreadPage } from "~/modules/views-manager/types.ts";
import { ArtifactCard } from "./panel.tsx";
import { iso, messages, seconds, type Call, type Message, type Part } from "./model.ts";

const LANG = { run: "bash", edit: "typescript" } as const;

function toItem(call: Call, diff: string | null) {
  const isEdit = call.tool === "edit";
  const plus = isEdit ? /\+(\d+)/u.exec(call.out)?.[1] : undefined;
  const minus = isEdit ? /−(\d+)/u.exec(call.out)?.[1] : undefined;
  return {
    key: call.id,
    name: call.tool,
    target: call.target,
    duration: seconds(call.took),
    status: call.ok ? ("complete" as const) : ("error" as const),
    ...(call.ok ? {} : { errorMessage: call.out.split("\n").slice(-1)[0] ?? "" }),
    ...(plus ? { additions: Number(plus) } : {}),
    ...(minus ? { deletions: Number(minus) } : {}),
    resultDetail: (
      <CodeBlock
        code={isEdit && diff !== null ? diff : call.out}
        language={LANG[call.tool as keyof typeof LANG] ?? "text"}
        isDiff={isEdit && diff !== null}
        maxHeight="50vh"
      />
    ),
  };
}

function PartView({
  part,
  page,
  title,
  onOpen,
}: {
  readonly part: Part;
  readonly page: ThreadPage;
  readonly title: string;
  readonly onOpen: () => void;
}) {
  if (part.kind === "say") return <ChatMessageBubble variant="ghost">{part.text}</ChatMessageBubble>;
  if (part.kind === "told") return <ChatMessageBubble variant="ghost">{`${part.by}: ${part.text}`}</ChatMessageBubble>;
  if (part.kind === "think") {
    return (
      <Collapsible
        chevronPosition="start"
        defaultIsOpen={false}
        trigger={
          <Text type="supporting" color="secondary">
            Thinking
          </Text>
        }
      >
        <Text type="supporting" color="secondary">
          {part.text}
        </Text>
      </Collapsible>
    );
  }
  return (
    <>
      <ChatToolCalls defaultIsExpanded calls={part.calls.map((one) => toItem(one, page.thread.diff))} />
      {part.calls.some((one) => one.tool === "edit") && <ArtifactCard title={title} onOpen={onOpen} />}
    </>
  );
}

function Said(props: {
  readonly message: Message;
  readonly isLast: boolean;
  readonly page: ThreadPage;
  readonly role: string;
  readonly zone: string;
  readonly title: string;
  readonly onOpen: () => void;
}) {
  const { message, isLast, page, role, zone, title, onOpen } = props;
  const { running } = page;
  return (
    <ChatMessage sender="assistant" avatar={<Avatar name={role} size="md" />}>
      {message.parts.map((part, i) => (
        <PartView key={i} part={part} page={page} title={title} onOpen={onOpen} />
      ))}
      {isLast && running !== null && (
        <ChatToolCalls calls={[{ key: "live", name: running.tool, target: running.target, status: "running" }]} />
      )}
      <ChatMessageMetadata timestamp={iso(message.at, zone).slice(11, 16)} />
    </ChatMessage>
  );
}

/** Read only: the brief from the manager, then what the thread said, thought and did. */
export function Transcript(props: {
  readonly page: ThreadPage;
  readonly role: string;
  readonly manager: string;
  readonly zone: string;
  readonly started: string;
  readonly startedAt: string;
  readonly title: string;
  readonly onOpen: () => void;
}) {
  const { page, role, manager, zone, started, startedAt, title, onOpen } = props;
  const all = messages(page.thread.lines);
  return (
    <>
      <ChatSystemMessage variant="divider">{started}</ChatSystemMessage>
      <ChatMessage sender="user">
        <ChatMessageBubble
          metadata={
            <ChatMessageMetadata
              timestamp={startedAt}
              footer={
                <Text type="supporting" color="secondary">
                  The brief, from {manager}
                </Text>
              }
            />
          }
        >
          {page.thread.brief}
        </ChatMessageBubble>
      </ChatMessage>
      {all.map((one, i) => (
        <Said
          key={`${one.at}-${i}`}
          message={one}
          isLast={i === all.length - 1}
          page={page}
          role={role}
          zone={zone}
          title={title}
          onOpen={onOpen}
        />
      ))}
    </>
  );
}
