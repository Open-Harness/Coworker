// astryx-template: ai-chat
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { Shown } from "./engine.ts";

/* What the co-worker says while it is at work, as a live region, and how a person stops it, skips to where it is theirs, or sends it away. */

interface Props {
  readonly name: string;
  readonly shown: Shown;
  readonly onStop: () => void;
  readonly onSkip: () => void;
  readonly onClose: () => void;
}

export function Panel({ name, shown, onStop, onSkip, onClose }: Props) {
  const isPlaying = shown.mode === "playing";
  return (
    <Card
      padding={3}
      aria-label={`${name} at work`}
      style={{
        position: "fixed",
        left: "50%",
        bottom: 16,
        transform: "translateX(-50%)",
        width: "min(560px, calc(100vw - 32px))",
        zIndex: 1000,
        boxShadow: "var(--shadow-high)",
      }}
    >
      <HStack gap={2} vAlign="start">
        <Avatar name={name} size={24} tooltip={false} />
        <StackItem size="fill">
          <VStack gap={2}>
            <Text type="body" role="status">
              {shown.say}
            </Text>
            <HStack gap={2} vAlign="center" wrap="wrap">
              {shown.mode === "yours" && <Badge variant="warning" label="Waits for you" />}
              <Text type="supporting" color="secondary">{`${Math.min(shown.n + 1, shown.of)} of ${shown.of}`}</Text>
              {isPlaying && <Button label="Stop" size="sm" variant="secondary" onClick={onStop} />}
              {isPlaying && <Button label="Skip to the end" size="sm" variant="ghost" onClick={onSkip} />}
              {!isPlaying && <Button label="Close" size="sm" variant="ghost" onClick={onClose} />}
            </HStack>
          </VStack>
        </StackItem>
      </HStack>
    </Card>
  );
}
