import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import type { SaveState } from "./use-save.ts";

/** The end of a form: what is unsaved, what the last save did, and the two things to do about it. */
export function SaveBar({
  state,
  isDirty,
  isReady = true,
  label = "Save changes",
  onSave,
  onDiscard,
}: {
  readonly state: SaveState;
  readonly isDirty: boolean;
  readonly isReady?: boolean;
  readonly label?: string;
  readonly onSave: () => Promise<void>;
  readonly onDiscard: () => void;
}) {
  return (
    <VStack gap={3}>
      {state._tag === "failed" && <Banner status="error" title="Not saved" description={state.message} />}
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          {state._tag === "saving" && <Badge variant="info" label="Saving…" />}
          {state._tag === "saved" && !isDirty && <Badge variant="success" label="Saved" />}
          {isDirty && state._tag !== "saving" && <Badge variant="warning" label="Unsaved changes" />}
        </StackItem>
        <Button label="Discard" variant="ghost" isDisabled={!isDirty || state._tag === "saving"} onClick={onDiscard} />
        <Button label={label} variant="primary" isDisabled={!isDirty || !isReady} clickAction={onSave} />
      </HStack>
    </VStack>
  );
}
