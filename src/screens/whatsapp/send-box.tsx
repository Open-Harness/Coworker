import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { ChatComposer } from "@astryxdesign/core/Chat";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { HStack } from "@astryxdesign/core/Layout";
import type { Mode } from "./types.ts";

/** The box at the bottom: tell the manager, or write to the other side as the manager. */
export function SendBox({
  who,
  mode,
  onMode,
  onSend,
  about,
  isDisabled,
  disabledHint,
}: {
  who: string;
  mode: Mode;
  onMode: (m: Mode) => void;
  onSend: (text: string) => void;
  about: string;
  isDisabled?: boolean;
  disabledHint?: string;
}) {
  const label = mode === "tell" ? `Tell ${who}` : `Write as ${who}`;
  return (
    <ChatComposer
      placeholder={
        isDisabled ? (disabledHint ?? "") : mode === "tell" ? `Tell ${who} about this ${about}` : `Write as ${who}. It stays quiet after.`
      }
      isDisabled={isDisabled ?? false}
      onSubmit={onSend}
      footerActions={
        <DropdownMenu
          button={{ label, variant: "ghost", size: "sm" }}
          items={[
            { label: `Tell ${who}`, onClick: () => onMode("tell") },
            { label: `Write as ${who}`, onClick: () => onMode("write") },
          ]}
        />
      }
    />
  );
}

/** Header mark while a person has the conversation. */
export function Yours({ onBack }: { onBack: () => void }) {
  return (
    <HStack gap={2} vAlign="center">
      <Badge label="Yours" variant="neutral" />
      <Button label="Hand back" variant="secondary" size="sm" onClick={onBack} />
    </HStack>
  );
}
