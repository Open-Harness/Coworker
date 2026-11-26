// astryx-template: ai-chat
import type { CSSProperties } from "react";
import { Card } from "@astryxdesign/core/Card";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import { Text } from "@astryxdesign/core/Text";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { ChatBubbleLeftRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Reading, useApi, useBrowser, useClock, useGo, useRead, useRefresh } from "~/modules/page/service.ts";
import type { PageProps } from "~/modules/page/types.ts";
import type { ChatView } from "~/modules/views-workspace/types.ts";
import { Column } from "./column.tsx";

const column: CSSProperties = { flex: 1, width: "100%", minWidth: 0, height: "100%" };
const panel: CSSProperties = { overflow: "hidden", display: "flex", flexDirection: "column", flexShrink: 0 };

/** Sending a line to a chat: the page asks again what the chat says. */
function useSend(chat: string) {
  const [api, refresh, { newId }] = [useApi(), useRefresh(), useBrowser()];
  return async (text: string) => {
    const sent = await api.write("/chats/:chat", { text, key: newId() }, { chat });
    if (sent._tag === "Ok") refresh([`/chats/${chat}`, "/chats", "/shell"]);
  };
}

interface Opened {
  readonly main: ChatView;
  /** The chat forked from it that is open beside it. */
  readonly fork: ChatView | null;
  readonly juno: string;
}

function Chat({ main, fork, juno }: Opened) {
  const isNarrow = useMediaQuery("(max-width: 1000px)");
  const size = useResizable({ defaultSize: 520, minSize: 360, maxSize: 800, autoSaveId: "juno-fork" });
  const [go, clock] = [useGo(), useClock()];
  const [sendMain, sendFork] = [useSend(main.chat.id), useSend(fork?.chat.id ?? main.chat.id)];
  const open = (chat: string) => go(`/chats/${chat}`);
  const forkedAt = fork === null || fork.chat.knew === null ? undefined : main.lines[fork.chat.knew - 1];
  const today = main.lines[0] === undefined ? "Today" : clock.short(main.lines[0].at);
  const forkPane =
    fork === null ? null : (
      <>
        <Toolbar
          label="Forked chat"
          dividers={["bottom"]}
          startContent={
            <HStack gap={3} vAlign="center">
              <Icon icon={ChatBubbleLeftRightIcon} size="sm" color="secondary" />
              <VStack gap={0}>
                <Text type="label" weight="semibold">
                  {fork.chat.title}
                </Text>
                {forkedAt === undefined ? null : (
                  <Text type="supporting" color="secondary">
                    Forked at {clock.time(forkedAt.at)}, knew {fork.chat.knew} messages
                  </Text>
                )}
              </VStack>
            </HStack>
          }
          endContent={
            <IconButton
              label="Close"
              variant="ghost"
              size="sm"
              icon={<Icon icon={XMarkIcon} size="sm" />}
              onClick={() => open(main.chat.id)}
            />
          }
        />
        <Column
          lines={fork.lines}
          forks={fork.forks}
          note={`Forked from ${main.chat.title}`}
          placeholder="Ask in this fork"
          juno={juno}
          onFork={open}
          onSend={(text) => void sendFork(text)}
        />
      </>
    );
  return (
    <VStack height="100%">
      <Layout
        height="fill"
        content={
          <LayoutContent role="main" padding={0}>
            <VisuallyHidden as="h1">{main.chat.title}</VisuallyHidden>
            <HStack height="100%">
              {isNarrow && forkPane !== null ? (
                <VStack style={column}>{forkPane}</VStack>
              ) : (
                <>
                  <VStack style={column}>
                    <Column
                      lines={main.lines}
                      forks={main.forks}
                      note={today.includes(":") ? "Today" : today}
                      placeholder="Tell Juno, or say it"
                      juno={juno}
                      onFork={open}
                      onSend={(text) => void sendMain(text)}
                    />
                  </VStack>
                  {forkPane !== null && (
                    <>
                      <ResizeHandle
                        direction="horizontal"
                        resizable={size.props}
                        isReversed
                        pillPlacement="start"
                        hasDivider
                        label="Resize the fork"
                      />
                      <Card variant="transparent" padding={0} height="100%" style={{ ...panel, width: size.size }}>
                        {forkPane}
                      </Card>
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

/** A fork is a chat of its own, but it is read beside what it was forked from. */
function Forked({ chat, under, juno }: { chat: ChatView; under: string; juno: string }) {
  return (
    <Reading from="/chats/:chat" parts={{ chat: under }} failed="We could not read the chat this was forked from">
      {(main) => <Chat main={main} fork={chat} juno={juno} />}
    </Reading>
  );
}

export default function ChatPage({ params }: PageProps) {
  const shell = useRead("/shell");
  const juno = shell._tag === "Ok" ? shell.value.coworker.name : "Juno";
  return (
    <Reading from="/chats/:chat" parts={params} failed="We could not read this chat" gone={{ title: "This chat is not here" }}>
      {(view) =>
        view.chat.under === null ? <Chat main={view} fork={null} juno={juno} /> : <Forked chat={view} under={view.chat.under} juno={juno} />
      }
    </Reading>
  );
}
