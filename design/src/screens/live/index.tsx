// astryx-template: ai-chat
import { useRef, useState, type CSSProperties } from "react";
import { Card } from "@astryxdesign/core/Card";
import { Dialog } from "@astryxdesign/core/Dialog";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { Shell } from "../../shell";
import { Stage } from "./stage";
import { Talk } from "./talk";
import { useWalk } from "./use-walk";

const MOBILE_MAX_WIDTH = 760;
const root: CSSProperties = { height: "100%", width: "100%", containerType: "inline-size", containerName: "artifact" };
const chatColumn: CSSProperties = { flex: 1, width: "100%", minWidth: 0, height: "100%" };
const CSS = `
.ai-chat-resize-handle { display: flex; }
.ai-chat-column-beside-handle { padding-inline-end: var(--spacing-2); }
.ai-chat-artifact-panel { overflow: hidden; display: flex; flex-direction: column; width: min(var(--artifact-panel-width), 66%); flex-shrink: 0; }
@container artifact (max-width: ${MOBILE_MAX_WIDTH}px) {
  .ai-chat-resize-handle { display: none; }
  .ai-chat-column-beside-handle { padding-inline-end: 0; }
  .ai-chat-artifact-panel { display: none; }
}`;

/** #live plays it, #live-try is by hand, #live-5 stands still at a step. */
const asked = () => { const h = location.hash.slice(1); const n = /^live-(\d+)$/.exec(h); return { from: n ? Number(n[1]) : 0, plays: h === "live", byHand: h === "live-try" }; };

export default function Live() {
  const [start] = useState(asked);
  const w = useWalk(start.from, start.plays, start.byHand);
  const [isOpen, setOpen] = useState(true);
  const rootRef = useRef<HTMLElement>(null);
  const isNarrow = useMediaQuery("(max-width: 1000px)");
  const [isPhoneOpen, setPhoneOpen] = useState(false);
  const size = useResizable({ defaultSize: 760, minSize: 480, maxSize: 1100, autoSaveId: "juno-stage" });
  const watch = () => { if ((rootRef.current?.offsetWidth ?? Infinity) <= MOBILE_MAX_WIDTH) setPhoneOpen(true); else setOpen(true); };
  return (
    <Shell at="live" place="Sales">
      <VStack ref={rootRef} style={root}>
        <style>{CSS}</style>
        <Layout height="fill"
          content={
            <LayoutContent role="main" padding={0}>
              <VisuallyHidden as="h1">Look for signs, Tuesday to Friday</VisuallyHidden>
              <HStack height="100%">
                <VStack style={chatColumn} className={isOpen ? "ai-chat-column-beside-handle" : undefined}><Talk w={w} onWatch={watch} isWatching={isOpen && !isNarrow} /></VStack>
                {isOpen && (
                  <>
                    <ResizeHandle direction="horizontal" resizable={size.props} isReversed pillPlacement="start" hasDivider label="Resize the screen" className="ai-chat-resize-handle" />
                    <Card variant="transparent" padding={0} height="100%" className="ai-chat-artifact-panel" style={{ "--artifact-panel-width": typeof size.size === "number" ? `${size.size}px` : size.size } as CSSProperties}>
                      <Stage w={w} onClose={() => setOpen(false)} />
                    </Card>
                  </>
                )}
              </HStack>
            </LayoutContent>
          }
        />
        <Dialog isOpen={isPhoneOpen} onOpenChange={setPhoneOpen} purpose="info" variant="fullscreen" padding={0}>{isPhoneOpen && <VStack height="100%"><Stage w={w} onClose={() => setPhoneOpen(false)} /></VStack>}</Dialog>
      </VStack>
    </Shell>
  );
}
