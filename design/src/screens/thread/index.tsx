// astryx-template: ai-chat
import { useRef, useState } from "react";
import { HStack, Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { ChatLayout, ChatMessageList } from "@astryxdesign/core/Chat";
import { Card } from "@astryxdesign/core/Card";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Icon } from "@astryxdesign/core/Icon";
import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import { Text } from "@astryxdesign/core/Text";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { DocumentTextIcon as DocumentIcon } from "@heroicons/react/24/outline";
import { NoComposer } from "./composer";
import type { View } from "./data";
import { ThreadHeader } from "./header";
import { MobilePanelActions, PanelActions, PanelBody, viewOf } from "./panel";
import { CSS, MOBILE_MAX_WIDTH, chatColumn, chatLayout, panelWidthVar, root } from "./styles";
import { Transcript } from "./transcript";

export default function ThreadScreen() {
  // Mobile shows the panel as a full-screen dialog; desktop as a side panel.
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isPanelOpen, setPanelOpen] = useState(true);
  const [view, setView] = useState<View>("changes");
  const rootRef = useRef<HTMLElement>(null);
  const resize = useResizable({ defaultSize: 560, minSize: 400, maxSize: 900, autoSaveId: "thread-panel" });
  const shown = viewOf(view);

  // Match the container-query breakpoint by measuring the root, not the viewport.
  const openPanel = () => {
    const width = rootRef.current?.offsetWidth ?? Infinity;
    if (width <= MOBILE_MAX_WIDTH) setDialogOpen(true); else setPanelOpen(true);
  };

  return (
    <VStack ref={rootRef} style={root}>
      <style>{CSS}</style>
      <Layout
        height="fill"
        header={<ThreadHeader />}
        content={
          <LayoutContent role="main" padding={0}>
            <VisuallyHidden as="h1">Thread thread-46</VisuallyHidden>
            <HStack height="100%">
              {/* Transcript column: flexes to fill the space the panel leaves */}
              <VStack style={chatColumn} className={isPanelOpen ? "ai-chat-column-beside-handle" : undefined}>
                <ChatLayout density="spacious" style={chatLayout} composer={<NoComposer />}>
                  <ChatMessageList>
                    <Transcript onOpen={openPanel} />
                  </ChatMessageList>
                </ChatLayout>
              </VStack>

              {/* Desktop split-pane: resize handle + panel */}
              {isPanelOpen && (
                <>
                  <ResizeHandle direction="horizontal" resizable={resize.props} isReversed pillPlacement="start" hasDivider label="Resize panel" className="ai-chat-resize-handle" />
                  {/* Toolbar as the card header, body below */}
                  <Card variant="transparent" height="100%" className="ai-chat-artifact-panel" style={panelWidthVar(resize.size)}>
                    <Toolbar
                      label="Panel actions"
                      dividers={["bottom"]}
                      startContent={
                        <HStack gap={3} vAlign="center">
                          <Icon icon={DocumentIcon} size="sm" color="secondary" />
                          <VStack gap={0}>
                            <Text type="label" weight="semibold">{shown.title}</Text>
                            <Text type="supporting" color="secondary">{shown.sub}</Text>
                          </VStack>
                        </HStack>
                      }
                      endContent={<PanelActions view={view} onView={setView} onClose={() => setPanelOpen(false)} />}
                    />
                    <PanelBody view={view} />
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
          header={<DialogHeader title={shown.title} subtitle={shown.sub} hasDivider onOpenChange={setDialogOpen} endContent={<MobilePanelActions view={view} onView={setView} />} />}
          content={<LayoutContent padding={0}><PanelBody view={view} /></LayoutContent>}
        />
      </Dialog>
    </VStack>
  );
}
