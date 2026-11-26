import { ShareIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, Layout, LayoutContent, LayoutPanel, VStack } from "@astryxdesign/core/Layout";
import { Markdown } from "@astryxdesign/core/Markdown";
import { useResizable } from "@astryxdesign/core/Resizable";
import { Section } from "@astryxdesign/core/Section";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import type { DocumentVersion } from "~/modules/protocol/types.ts";
import type { DocumentPanelProps } from "../types.ts";
import { CopyButton } from "./CopyButton.tsx";
import { documentIcon, documentKind } from "./DocumentCard.tsx";

function DocumentActions({
  row,
  document,
  onVersion,
  onShare,
  onClose,
}: Partial<Pick<DocumentPanelProps, "onClose">> & Omit<DocumentPanelProps, "onClose">) {
  const shown = document?.version ?? row.version;
  return (
    <>
      <DropdownMenu
        button={{ label: `v${shown}`, variant: "ghost", size: "sm" }}
        items={row.versions.toReversed().map((version) => ({
          label: version === row.version ? `v${version} (current)` : `v${version}`,
          onClick: () => onVersion(version),
        }))}
      />
      <CopyButton text={document?.content ?? ""} label="Copy document" />
      <Button label="Copy link" variant="ghost" size="sm" icon={<Icon icon={ShareIcon} size="sm" />} isIconOnly onClick={onShare} />
      {onClose !== undefined && (
        <Button label="Close document" variant="ghost" size="sm" icon={<Icon icon={XMarkIcon} size="sm" />} isIconOnly onClick={onClose} />
      )}
    </>
  );
}

/** Models often write the title into the document as well. */
const startsWithTitle = ({ language, content }: DocumentVersion): boolean => language === "markdown" && /^\s*# /u.test(content);

function DocumentBody({ document, problem }: Pick<DocumentPanelProps, "document" | "problem">) {
  if (problem !== undefined) return <Banner status="error" title={problem} container="section" />;
  if (document === undefined) {
    return (
      <Center padding={8}>
        <Spinner aria-label="Loading the document" />
      </Center>
    );
  }
  return (
    <Section variant="transparent">
      <VStack gap={2}>
        {!startsWithTitle(document) && (
          <Heading level={1} accessibilityLevel={2}>
            {document.title}
          </Heading>
        )}
        {document.language === "markdown" ? (
          <Markdown headingLevelStart={2}>{document.content}</Markdown>
        ) : (
          <CodeBlock code={document.content} language={document.language} width="100%" hasLineNumbers />
        )}
      </VStack>
    </Section>
  );
}

const Subtitle = ({ row }: Pick<DocumentPanelProps, "row">) => (
  <HStack gap={1}>
    <Text type="supporting" color="secondary">
      {`${documentKind(row.language)} · Updated`}
    </Text>
    <Timestamp value={row.updatedAt / 1000} format="relative" isLive />
  </HStack>
);

/** A document beside the conversation. */
export function DocumentPanel(props: DocumentPanelProps) {
  const { row } = props;
  const resizable = useResizable({ defaultSize: 560, minSize: 380, maxSize: 960, autoSaveId: "pi-exp-document" });
  return (
    <LayoutPanel label={row.title} padding={0} hasDivider resizable={resizable.props} width={resizable.size}>
      <Toolbar
        label="Document actions"
        dividers={["bottom"]}
        startContent={
          <HStack gap={3} vAlign="center">
            <Icon icon={documentIcon(row.language)} size="sm" color="secondary" />
            <VStack gap={0}>
              <Text type="label" weight="semibold" maxLines={1}>
                {row.title}
              </Text>
              <Subtitle row={row} />
            </VStack>
          </HStack>
        }
        endContent={<DocumentActions {...props} />}
      />
      <DocumentBody {...props} />
    </LayoutPanel>
  );
}

/** The same document on a narrow screen. */
export function DocumentDialog(props: DocumentPanelProps) {
  const { onClose, ...rest } = props;
  return (
    <Dialog isOpen onOpenChange={(isOpen) => !isOpen && onClose()} purpose="info" variant="fullscreen">
      <Layout
        header={
          <DialogHeader
            title={props.row.title}
            subtitle={documentKind(props.row.language)}
            hasDivider
            onOpenChange={onClose}
            endContent={<DocumentActions {...rest} />}
          />
        }
        content={
          <LayoutContent padding={0}>
            <DocumentBody {...props} />
          </LayoutContent>
        }
      />
    </Dialog>
  );
}
