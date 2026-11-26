// astryx-template: ai-chat
import { useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { ChatLayout, ChatMessageList } from "@astryxdesign/core/Chat";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import { Text } from "@astryxdesign/core/Text";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { DocumentTextIcon as DocumentIcon } from "@heroicons/react/24/outline";
import { Reading, useClock, useRead } from "~/modules/page/service.ts";
import type { PageProps } from "~/modules/page/types.ts";
import type { ThreadPage } from "~/modules/views-manager/types.ts";
import { dayMonth, useZone } from "../manager-frame/words.ts";
import { NoComposer } from "./composer.tsx";
import { ThreadHeader } from "./header.tsx";
import { viewsOf, type View } from "./model.ts";
import { MobilePanelActions, PanelActions, PanelBody } from "./panel.tsx";
import { MOBILE_MAX_WIDTH, useWidth } from "./surface.ts";
import { Transcript } from "./transcript.tsx";

const ROOT = { height: "100%", width: "100%" } as const;
const COLUMN = { flex: 1, width: "100%", minWidth: 0, height: "100%" } as const;
const CHAT = { flex: 1, minHeight: 0 } as const;
/** The scrollbar ends where the handle's grab zone begins, so the zone never covers it. */
const BESIDE_HANDLE = { paddingInlineEnd: "var(--spacing-2)" } as const;

/** One thread, as it happened: the brief, what it said, thought and did, and the change it made beside it. */
function Thread({ page, manager, title }: { readonly page: ThreadPage; readonly manager: string; readonly title: string }) {
  const [clock, zone, shell] = [useClock(), useZone(), useRead("/shell")];
  const juno = shell._tag === "Ok" ? shell.value.coworker.name : "the co-worker";
  // Mobile shows the panel as a full-screen dialog; desktop as a side panel.
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isPanelOpen, setPanelOpen] = useState(true);
  const [view, setView] = useState<View>("changes");
  const [rootRef, width] = useWidth();
  const resize = useResizable({ defaultSize: 560, minSize: 400, maxSize: 900, autoSaveId: "thread-panel" });
  const views = viewsOf({ page, manager, clock, zone });
  const shown = views.find((one) => one.id === view) ?? views[0];
  const isMobile = width > 0 && width <= MOBILE_MAX_WIDTH;
  const { thread } = page;
  if (shown === undefined) return null;
  const changes = views[0]?.title ?? "";
  const openPanel = () => {
    if (isMobile) setDialogOpen(true);
    else setPanelOpen(true);
  };
  return (
    <VStack ref={rootRef} style={ROOT}>
      <Layout
        height="fill"
        header={<ThreadHeader page={page} title={title} />}
        content={
          <LayoutContent role="main" padding={0}>
            <VisuallyHidden as="h1">{`Thread ${thread.id}`}</VisuallyHidden>
            <HStack height="100%">
              {/* Transcript column: flexes to fill the space the panel leaves */}
              <VStack style={isPanelOpen && !isMobile ? { ...COLUMN, ...BESIDE_HANDLE } : COLUMN}>
                <ChatLayout density="spacious" style={CHAT} composer={<NoComposer id={thread.id} manager={manager} juno={juno} />}>
                  <ChatMessageList>
                    <Transcript
                      page={page}
                      role={title}
                      manager={manager}
                      zone={zone}
                      started={`${dayMonth(thread.started, zone)}, ${clock.time(thread.started)}`}
                      startedAt={clock.time(thread.started)}
                      title={changes}
                      onOpen={openPanel}
                    />
                  </ChatMessageList>
                </ChatLayout>
              </VStack>
              {/* Desktop split-pane: resize handle + panel */}
              {isPanelOpen && !isMobile && (
                <>
                  <ResizeHandle
                    direction="horizontal"
                    resizable={resize.props}
                    isReversed
                    pillPlacement="start"
                    hasDivider
                    label="Resize panel"
                  />
                  {/* Toolbar as the card header, body below */}
                  <Card
                    variant="transparent"
                    height="100%"
                    style={{ overflow: "hidden", display: "flex", flexDirection: "column", width: resize.size, flexShrink: 0 }}
                  >
                    <Toolbar
                      label="Panel actions"
                      dividers={["bottom"]}
                      startContent={
                        <HStack gap={3} vAlign="center">
                          <Icon icon={DocumentIcon} size="sm" color="secondary" />
                          <VStack gap={0}>
                            <Text type="label" weight="semibold">
                              {shown.title}
                            </Text>
                            <Text type="supporting" color="secondary">
                              {shown.sub}
                            </Text>
                          </VStack>
                        </HStack>
                      }
                      endContent={
                        <PanelActions views={views} view={view} page={page} onView={setView} onClose={() => setPanelOpen(false)} />
                      }
                    />
                    <PanelBody view={view} page={page} />
                  </Card>
                </>
              )}
            </HStack>
          </LayoutContent>
        }
      />
      {/* Mobile panel view: full-screen Dialog */}
      <Dialog isOpen={isDialogOpen} onOpenChange={setDialogOpen} purpose="info" variant="fullscreen">
        <Layout
          header={
            <DialogHeader
              title={shown.title}
              subtitle={shown.sub}
              hasDivider
              onOpenChange={setDialogOpen}
              endContent={<MobilePanelActions views={views} view={view} page={page} onView={setView} />}
            />
          }
          content={
            <LayoutContent padding={0}>
              <PanelBody view={view} page={page} />
            </LayoutContent>
          }
        />
      </Dialog>
    </VStack>
  );
}

export default function ThreadPageScreen({ params }: PageProps) {
  const manager = params["manager"] ?? "";
  const shell = useRead("/shell");
  const name = shell._tag === "Ok" ? (shell.value.tree.find((one) => one.id === manager)?.name ?? manager) : manager;
  // The thread's own name is on the list it is in.
  const list = useRead("/m/:manager/threads", { manager });
  const id = params["thread"] ?? "";
  const title = list._tag === "Ok" ? (list.value.rows.find((one) => one.id === id)?.title ?? id) : id;
  return (
    <Reading from="/m/:manager/threads/:thread" parts={params} failed="We could not read this thread" gone={{ title: `${id} is not here` }}>
      {(page) => <Thread page={page} manager={name} title={title} />}
    </Reading>
  );
}
