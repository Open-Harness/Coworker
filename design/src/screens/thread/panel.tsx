import { VStack, HStack, StackItem } from "@astryxdesign/core/Layout";
import { Section } from "@astryxdesign/core/Section";
import { Button } from "@astryxdesign/core/Button";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Icon } from "@astryxdesign/core/Icon";
import { List, ListItem } from "@astryxdesign/core/List";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { useClipboard } from "@astryxdesign/core/hooks";
import { rtlStyles } from "@astryxdesign/core/utils";
import { ChevronRightIcon, ClipboardDocumentIcon as ClipboardIcon, DocumentTextIcon as DocumentIcon, XMarkIcon as CloseIcon } from "@heroicons/react/24/outline";
import { TRACE } from "../../world";
import { FILES_TOUCHED, TERMINAL, VIEWS, type View } from "./data";
import { artifactScroll } from "./styles";

export const viewOf = (v: View) => VIEWS.find((x) => x.id === v)!;
const textOf = (v: View) =>
  v === "changes" ? TRACE.diff : v === "terminal" ? TERMINAL : v === "files" ? FILES_TOUCHED.map((f) => `${f.path}  ${f.what}`).join("\n") : TRACE.mayUse.join("\n");

/** Copies what the panel shows and confirms with a toast, for the desktop toolbar and the narrow-screen menu alike. */
function useCopyView(view: View) {
  const showToast = useToast();
  const { copy } = useClipboard({ announce: "Copied" });
  return () => void copy(textOf(view)).then((ok) => showToast({ body: ok ? "Copied" : "Could not copy", uniqueID: "copy" }));
}

// Header actions: which view, copy. Pass `onClose` for the desktop close button.
export function PanelActions({ view, onView, onClose }: { view: View; onView: (v: View) => void; onClose?: () => void }) {
  const copyView = useCopyView(view);
  return (
    <>
      <DropdownMenu
        button={{ label: viewOf(view).label, variant: "ghost", size: "sm" }}
        items={VIEWS.map((v) => ({ label: v.id === view ? `${v.label} (shown)` : v.label, onClick: () => onView(v.id) }))}
      />
      <Button label="Copy" variant="ghost" size="sm" icon={<Icon icon={ClipboardIcon} size="sm" />} isIconOnly onClick={copyView} />
      {onClose != null && <Button label="Close panel" variant="ghost" size="sm" icon={<Icon icon={CloseIcon} size="sm" />} isIconOnly onClick={onClose} />}
    </>
  );
}

// Mobile variant: the actions collapse into an overflow menu.
export function MobilePanelActions({ view, onView }: { view: View; onView: (v: View) => void }) {
  const copyView = useCopyView(view);
  return (
    <MoreMenu
      label="Panel actions"
      size="sm"
      items={[
        { type: "section", title: "Show", items: VIEWS.map((v) => ({ label: v.id === view ? `${v.label} (shown)` : v.label, onClick: () => onView(v.id) })) },
        { type: "divider" },
        { label: "Copy", icon: ClipboardIcon, onClick: copyView },
      ]}
    />
  );
}

// Scrollable panel body.
export function PanelBody({ view }: { view: View }) {
  return (
    <Section variant="transparent" style={artifactScroll}>
      <VStack gap={2}>
        {view === "changes" && <CodeBlock title="src/export/stream.ts" code={TRACE.diff} language="typescript" isDiff />}
        {view === "terminal" && <CodeBlock title="Terminal" code={TERMINAL} language="bash" />}
        {view === "files" && (
          <List>{FILES_TOUCHED.map((f) => <ListItem key={f.path} label={f.path} description={f.what} />)}</List>
        )}
        {view === "may-use" && (
          <List>{TRACE.mayUse.map((m) => <ListItem key={m} label={m} />)}</List>
        )}
      </VStack>
    </Section>
  );
}

// In-message card that opens the panel/dialog.
export function ArtifactCard({ onOpen }: { onOpen: () => void }) {
  return (
    <ClickableCard label={`Open ${viewOf("changes").title}`} onClick={onOpen} variant="muted" padding={3} maxWidth={360}>
      <HStack gap={3} vAlign="center" width="100%">
        <Icon icon={DocumentIcon} size="md" color="secondary" />
        <StackItem size="fill">
          <VStack gap={0}>
            <Text type="label" weight="semibold">{viewOf("changes").title}</Text>
            <Text type="supporting" color="secondary">The change it made</Text>
          </VStack>
        </StackItem>
        <Icon icon={ChevronRightIcon} size="sm" color="secondary" xstyle={rtlStyles.mirror} />
      </HStack>
    </ClickableCard>
  );
}
