import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { Loaded } from "~/modules/team-core/types.ts";

/**
 * Asks before something that cannot be undone, and says what the server said if it refuses. With `typed`, the button
 * waits until that exact text has been typed.
 */
export function ConfirmDialog({
  isOpen,
  title,
  description,
  actionLabel,
  typed,
  onClose,
  onConfirm,
}: {
  readonly isOpen: boolean;
  readonly title: string;
  readonly description: string;
  readonly actionLabel: string;
  readonly typed?: string;
  readonly onClose: () => void;
  readonly onConfirm: () => Promise<Loaded<unknown>>;
}) {
  const [answer, setAnswer] = useState("");
  const [failure, setFailure] = useState<string>();
  const close = () => {
    setAnswer("");
    setFailure(undefined);
    onClose();
  };
  const confirm = async () => {
    const result = await onConfirm();
    if (result._tag === "Failed") setFailure(result.message);
    else close();
  };
  return (
    <Dialog isOpen={isOpen} onOpenChange={(open) => !open && close()} purpose="required" width={460}>
      <Layout
        height="auto"
        header={<DialogHeader title={title} onOpenChange={close} hasDivider={false} />}
        content={
          <LayoutContent>
            <VStack gap={4}>
              <Text>{description}</Text>
              {typed !== undefined && (
                <TextInput label={`Type ${typed} to confirm`} value={answer} onChange={setAnswer} hasAutoFocus width="100%" />
              )}
              {failure !== undefined && <Banner status="error" title="It was not done" description={failure} />}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" variant="ghost" onClick={close} />
              <Button
                label={actionLabel}
                variant="destructive"
                isDisabled={typed !== undefined && answer !== typed}
                clickAction={confirm}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
