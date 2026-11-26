// astryx-template: table-tree
import type { RefObject } from "react";
import { HStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { ChatBubbleLeftRightIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { TreeRow } from "~/modules/views-workspace/types.ts";
import { STATE_WORD } from "./columns.tsx";

const DOT = { working: "success", "needs you": "warning", stuck: "error", idle: "neutral", paused: "neutral" } as const;

interface TreeHeaderProps {
  readonly root: TreeRow;
  /** Narrow, the actions give up their labels and the doing-now line moves under the header. */
  readonly isNarrow: boolean;
  readonly headerRef: RefObject<HTMLDivElement | null>;
  readonly onAsk: () => void;
  readonly onNew: () => void;
}

/** The page's title, how the co-worker is, and the two things to do from here. */
export function TreeHeader({ root, isNarrow, headerRef, onAsk, onNew }: TreeHeaderProps) {
  return (
    <Toolbar
      label="Managers"
      size="sm"
      dividers={["bottom"]}
      // Toolbar pads its own contents by 12px, but the table body sits on a 16px content line.
      style={{ paddingInline: "4px" }}
      startContent={
        <HStack gap={3} vAlign="center">
          <Heading level={1}>Managers</Heading>
          <HStack gap={1.5} vAlign="center">
            <StatusDot variant={DOT[root.is]} label={STATE_WORD[root.is]} />
            {!isNarrow && (
              <Text type="supporting" color="secondary">
                {root.now}
              </Text>
            )}
          </HStack>
        </HStack>
      }
      ref={headerRef}
      endContent={
        isNarrow ? (
          <>
            <IconButton
              variant="secondary"
              size="sm"
              icon={<Icon icon={ChatBubbleLeftRightIcon} size="sm" />}
              label="Ask Juno"
              onClick={onAsk}
            />
            <IconButton variant="primary" size="sm" icon={<Icon icon={PlusIcon} size="sm" />} label="New objective" onClick={onNew} />
          </>
        ) : (
          <>
            <Button size="sm" label="Ask Juno" icon={<Icon icon={ChatBubbleLeftRightIcon} size="sm" />} onClick={onAsk} />
            <Button size="sm" variant="primary" label="New objective" icon={<Icon icon={PlusIcon} size="sm" />} onClick={onNew} />
          </>
        )
      }
    />
  );
}
