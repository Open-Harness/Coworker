import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import type { Saving } from "./use-saving.ts";

/** What a form says about its save: a refusal in the server's words, then the buttons and how the last save went. */
export function SaveBar({
  status,
  isDirty,
  onSave,
  onDiscard,
  label = "Save changes",
}: {
  readonly status: Saving;
  readonly isDirty: boolean;
  readonly onSave: () => Promise<void>;
  readonly onDiscard: () => void;
  readonly label?: string;
}) {
  return (
    <VStack gap={3}>
      {status.state === "failed" && <Banner status="error" title="Not saved" description={status.message} />}
      <HStack gap={2} vAlign="center" wrap="wrap">
        <Button label={label} variant="primary" isDisabled={!isDirty} clickAction={onSave} />
        {isDirty && <Button label="Discard changes" variant="ghost" onClick={onDiscard} />}
        <Text type="supporting" role="status">
          {status.state === "saving" ? "Saving…" : status.state === "saved" && !isDirty ? "Saved" : isDirty ? "Not saved yet" : ""}
        </Text>
      </HStack>
    </VStack>
  );
}
