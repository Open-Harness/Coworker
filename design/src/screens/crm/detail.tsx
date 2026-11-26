import { useRef, useState } from "react";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { Heading } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import type { ChatComposerInputHandle } from "@astryxdesign/core/Chat";
import { withAnswer, withNote, withTold } from "./actions";
import type { Mode } from "./composer";
import type { Deal } from "./data";
import { DealHeader } from "./header";
import type { TabId } from "./header";
import { PanelContent, RightPanel } from "./rail";
import { DetailsTab, MailTab } from "./tabs";
import { TimelineSection } from "./timeline";

/** One deal, opened in place. `change` is the only way its state moves. */
export function DealPage({ deal, change, onBack }: { deal: Deal; change: (f: (d: Deal) => Deal) => void; onBack: () => void }) {
  const showToast = useToast();
  const [tab, setTab] = useState<TabId>("timeline");
  const [mode, setMode] = useState<Mode>("tell");
  const [showSidePanel, setShowSidePanel] = useState(true);
  const isNarrow = useMediaQuery("(max-width: 1024px)", true);
  const inputRef = useRef<ChatComposerInputHandle | null>(null);

  const write = (m: Mode) => { setMode(m); setTab("timeline"); setTimeout(() => inputRef.current?.focus(), 80); };
  const send = (text: string) => {
    change((d) => (mode === "tell" ? withTold(d, text) : withNote(d, text)));
    showToast({ body: mode === "tell" ? "Sales is told." : "Note written on the deal.", uniqueID: "crm-sent" });
  };
  const answer = (yes: boolean) => {
    change((d) => withAnswer(d, yes));
    showToast({ body: yes ? "Yes. Sales moves the deal." : "No. The deal stays where it is.", uniqueID: "crm-answer" });
  };

  return (
    <Layout
      height="fill"
      contentWidth={1000}
      defaultHasDividers
      header={<DealHeader deal={deal} tab={tab} onTab={setTab} isPanelOpen={showSidePanel} onTogglePanel={() => setShowSidePanel((p) => !p)} isNarrow={isNarrow} onBack={onBack} onWrite={write} />}
      content={
        <LayoutContent role="main">
          <VStack gap={4}>
            {tab === "details" && <DetailsTab deal={deal} />}
            {tab === "timeline" && <TimelineSection deal={deal} onAnswer={answer} mode={mode} onMode={setMode} onSend={send} inputRef={inputRef} />}
            {tab === "mail" && <MailTab deal={deal} />}
            {/* Narrow screens: the company and its people follow the main column instead of squeezing beside it. */}
            {isNarrow && (
              <VStack gap={4}>
                <Heading level={2}>About this deal</Heading>
                <PanelContent deal={deal} sectionLevel={3} />
              </VStack>
            )}
          </VStack>
        </LayoutContent>
      }
      end={!isNarrow && showSidePanel ? <RightPanel deal={deal} /> : undefined}
    />
  );
}
