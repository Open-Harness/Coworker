import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { Badge } from "@astryxdesign/core/Badge";
import { Center } from "@astryxdesign/core/Center";
import { ChatLayout } from "@astryxdesign/core/Chat";
import { HStack, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Heading } from "@astryxdesign/core/Text";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Spinner } from "@astryxdesign/core/Spinner";
import type { AgentStamp } from "~/modules/agent-config/types.ts";
import type { ChatRow, WorkspaceRow, WorkspaceState } from "~/modules/protocol/types.ts";
import type { ChatView } from "~/modules/transcript/types.ts";
import { PeopleHere, PromptComposer, RowMenu, Transcript, typingNote } from "~/modules/ui/service.ts";
import type { WorkspaceClient } from "~/modules/manager-client/types.ts";
import type { ChatScreenProps } from "../types.ts";
import { Gone } from "./Gone.tsx";
import { useDirectory, useDraft, useReport, useTyping, useWorkspace } from "./hooks.ts";
import { links } from "./links.ts";
import { useRowHandlers } from "./row-handlers.ts";
import { useSession } from "./page-context.ts";
import { WithDocument } from "./WithDocument.tsx";

interface OpenChat {
  readonly client: WorkspaceClient;
  readonly workspace: WorkspaceState;
  readonly view: ChatView;
  readonly chatId: number;
  readonly agent?: AgentStamp | undefined;
}

function ChatComposer({ client, workspace, view, chatId, agent }: OpenChat) {
  const report = useReport();
  const { me } = useSession();
  const { models } = useDirectory();
  const [draft, setDraft] = useDraft(`${client.id} ${chatId}`);
  const [mode, setMode] = useState<"followUp" | "steer">("followUp");
  const onTyping = useTyping(client, chatId);
  const model = view.model ?? workspace.settings.model ?? models[0];
  const change = (text: string) => {
    setDraft(text);
    onTyping(text);
  };
  const submit = async (content: string) => {
    if (content.trim() === "") return;
    setDraft("");
    const sent = await client.submit(chatId, content.trim(), view.running ? mode : "followUp");
    if (sent.ok) return;
    setDraft(content);
    void report(Promise.resolve(sent));
  };
  return (
    <PromptComposer
      value={draft}
      onChange={change}
      onSubmit={(content) => void submit(content)}
      placeholder={view.running ? "Add something while it answers" : "Ask anything"}
      documents={workspace.documents}
      models={models}
      isModelFixed={agent !== undefined}
      {...(model === undefined ? {} : { model })}
      thinkingLevel={view.thinkingLevel ?? workspace.settings.thinkingLevel}
      onConfigure={(choice) => void report(client.configure(chatId, choice))}
      headerContext={typingNote({ presence: workspace.presence, chatId }, me)}
      {...(view.running ? { running: { mode, onMode: setMode, onStop: () => void report(client.stop(chatId)) } } : {})}
      queued={view.queued.map(({ submissionId, author, text }) => ({ id: submissionId, label: `${author.name}: ${text}` }))}
      onWithdraw={(submissionId) => void report(client.withdraw(chatId, submissionId))}
    />
  );
}

function Conversation(props: OpenChat) {
  const { client, workspace, view, chatId } = props;
  const { me } = useSession();
  const report = useReport();
  const router = useRouter();
  const fork = async (entryId: number) => {
    const forked = await report(client.fork(chatId, entryId));
    if (forked !== undefined) router.history.push(links.chat(client.id, forked));
  };
  const openDocument = (documentId: string, version?: number) => {
    const row = workspace.documents.find(({ id }) => id === documentId);
    const shown = version === undefined || version === row?.version ? "" : `&v=${version}`;
    router.history.push(`${links.chat(client.id, chatId)}?doc=${encodeURIComponent(documentId)}${shown}`);
  };
  return (
    <VStack height="100%">
      <ChatLayout
        density="spacious"
        emptyState={<EmptyState title="Nothing said yet" description="Everyone here sees what you write." />}
        composer={<ChatComposer {...props} />}
      >
        <Transcript
          view={view}
          me={me}
          documents={workspace.documents}
          onLoadEarlier={async () => void (await report(client.loadEarlier(chatId)))}
          onFillGap={(gap) => void report(client.fillGap(chatId, gap))}
          onFork={(entryId) => void fork(entryId)}
          onOpenDocument={openDocument}
          {...(props.agent === undefined ? {} : { agentName: props.agent.name })}
          onContinue={() => void report(client.continueRun(chatId))}
        />
      </ChatLayout>
    </VStack>
  );
}

interface HeaderProps {
  readonly client: WorkspaceClient;
  readonly row: WorkspaceRow;
  readonly chat: ChatRow;
}

function ChatHeader({ client, row, chat }: HeaderProps) {
  const report = useReport();
  const presence = useSelector(client.state, ({ workspace }) => workspace?.presence) ?? [];
  const { chatHandlers } = useRowHandlers({ workspaceId: row.id, chatId: chat.id });
  return (
    <LayoutHeader hasDivider padding={3}>
      <HStack gap={3} vAlign="center">
        <StackItem size="fill">
          <Heading level={4} accessibilityLevel={1} maxLines={1}>
            {chat.title}
          </Heading>
        </StackItem>
        {chat.agent !== undefined && <Badge label={`${chat.agent.name} · v${chat.agent.version}`} />}
        <PeopleHere presence={presence} chatId={chat.id} />
        <RowMenu
          kind="chat"
          title={chat.title}
          isPinned={chat.pinned}
          isArchived={chat.archivedAt !== undefined}
          deleteWarning="Its messages are deleted for everyone. Documents it made stay."
          extraItems={[{ label: "Summarize earlier messages", onClick: () => void report(client.compact(chat.id)) }]}
          {...chatHandlers(row, chat)}
        />
      </HStack>
    </LayoutHeader>
  );
}

function ChatContent({ client, chatId, agent }: Pick<OpenChat, "client" | "chatId" | "agent">) {
  const view = useSelector(client.state, ({ chats }) => chats[chatId]);
  const workspace = useSelector(client.state, (state) => state.workspace);
  useEffect(() => {
    client.openChat(chatId);
    return () => client.leaveChat(chatId);
  }, [client, chatId]);
  return (
    <LayoutContent padding={0} isScrollable={false}>
      {view === undefined || workspace === undefined ? (
        <Center minHeight="100%">
          <Spinner aria-label="Opening the chat" />
        </Center>
      ) : (
        <Conversation client={client} workspace={workspace} view={view} chatId={chatId} agent={agent} />
      )}
    </LayoutContent>
  );
}

/** One conversation, with everyone in it. */
export function ChatScreen({ workspaceId, chatId, search }: ChatScreenProps) {
  const { loaded, workspaces } = useDirectory();
  const row = workspaces.find(({ id }) => id === workspaceId);
  const chat = row?.chats.find(({ id }) => id === chatId);
  const client = useWorkspace(workspaceId);
  if (loaded && (row === undefined || chat === undefined)) {
    return <Gone kind={row === undefined ? "workspace" : "chat"} workspaceId={row?.id} />;
  }
  if (client === undefined || row === undefined || chat === undefined) return null;
  return (
    <WithDocument
      client={client}
      search={search}
      address={links.chat(workspaceId, chatId)}
      header={<ChatHeader client={client} row={row} chat={chat} />}
      content={<ChatContent key={`${workspaceId} ${chatId}`} client={client} chatId={chatId} agent={chat.agent} />}
    />
  );
}
