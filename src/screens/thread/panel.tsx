// astryx-template: ai-chat
import { Button } from "@astryxdesign/core/Button";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { useClipboard } from "@astryxdesign/core/hooks";
import { rtlStyles } from "@astryxdesign/core/utils";
import {
  ChevronRightIcon,
  ClipboardDocumentIcon as ClipboardIcon,
  DocumentTextIcon as DocumentIcon,
  XMarkIcon as CloseIcon,
} from "@heroicons/react/24/outline";
import type { ThreadPage } from "~/modules/views-manager/types.ts";
import { fileOf, terminalOf, textOf, type Shown, type View } from "./model.ts";

const SCROLL = { flex: 1, overflowY: "auto" } as const;

/** Copies what the panel shows and confirms with a toast, for the desktop toolbar and the narrow-screen menu alike. */
function useCopyView(view: View, page: ThreadPage) {
  const showToast = useToast();
  const { copy } = useClipboard({ announce: "Copied" });
  return () => void copy(textOf(view, page)).then((ok) => showToast({ body: ok ? "Copied" : "Could not copy", uniqueID: "copy" }));
}

interface ActionsProps {
  readonly views: readonly Shown[];
  readonly view: View;
  readonly page: ThreadPage;
  readonly onView: (view: View) => void;
}

// Header actions: which view, copy. Pass `onClose` for the desktop close button.
export function PanelActions({ views, view, page, onView, onClose }: ActionsProps & { readonly onClose?: () => void }) {
  const copyView = useCopyView(view, page);
  return (
    <>
      <DropdownMenu
        button={{ label: views.find((one) => one.id === view)?.label ?? "", variant: "ghost", size: "sm" }}
        items={views.map((one) => ({ label: one.id === view ? `${one.label} (shown)` : one.label, onClick: () => onView(one.id) }))}
      />
      <Button label="Copy" variant="ghost" size="sm" icon={<Icon icon={ClipboardIcon} size="sm" />} isIconOnly onClick={copyView} />
      {onClose != null && (
        <Button label="Close panel" variant="ghost" size="sm" icon={<Icon icon={CloseIcon} size="sm" />} isIconOnly onClick={onClose} />
      )}
    </>
  );
}

// Mobile variant: the actions collapse into an overflow menu.
export function MobilePanelActions({ views, view, page, onView }: ActionsProps) {
  const copyView = useCopyView(view, page);
  return (
    <MoreMenu
      label="Panel actions"
      size="sm"
      items={[
        {
          type: "section",
          title: "Show",
          items: views.map((one) => ({ label: one.id === view ? `${one.label} (shown)` : one.label, onClick: () => onView(one.id) })),
        },
        { type: "divider" },
        { label: "Copy", icon: ClipboardIcon, onClick: copyView },
      ]}
    />
  );
}

// Scrollable panel body.
export function PanelBody({ view, page }: { readonly view: View; readonly page: ThreadPage }) {
  return (
    <Section variant="transparent" style={SCROLL}>
      <VStack gap={2}>
        {view === "changes" && page.thread.diff !== null && (
          <CodeBlock title={fileOf(page)} code={page.thread.diff} language="typescript" isDiff />
        )}
        {view === "terminal" && <CodeBlock title="Terminal" code={terminalOf(page)} language="bash" />}
        {view === "files" && (
          <List>
            {page.touched.map((one) => (
              <ListItem key={one.path} label={one.path} description={one.says} />
            ))}
          </List>
        )}
        {view === "may-use" && (
          <List>
            {page.thread.mayUse.map((one) => (
              <ListItem key={one} label={one} />
            ))}
          </List>
        )}
      </VStack>
    </Section>
  );
}

// In-message card that opens the panel/dialog.
export function ArtifactCard({ title, onOpen }: { readonly title: string; readonly onOpen: () => void }) {
  return (
    <ClickableCard label={`Open ${title}`} onClick={onOpen} variant="muted" padding={3} maxWidth={360}>
      <HStack gap={3} vAlign="center" width="100%">
        <Icon icon={DocumentIcon} size="md" color="secondary" />
        <StackItem size="fill">
          <VStack gap={0}>
            <Text type="label" weight="semibold">
              {title}
            </Text>
            <Text type="supporting" color="secondary">
              The change it made
            </Text>
          </VStack>
        </StackItem>
        <Icon icon={ChevronRightIcon} size="sm" color="secondary" xstyle={rtlStyles.mirror} />
      </HStack>
    </ClickableCard>
  );
}
