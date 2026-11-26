import type { RefObject } from "react";
import { ChatComposer, ChatComposerInput } from "@astryxdesign/core/Chat";
import type { ChatComposerInputHandle } from "@astryxdesign/core/Chat";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Text } from "@astryxdesign/core/Text";

export type Mode = "tell" | "note";
const WAYS: Record<Mode, { label: string; placeholder: string; hint: string }> = {
  tell: { label: "Tell Sales", placeholder: "Tell Sales something about this deal. The customer does not see it.", hint: "Only Sales reads it" },
  note: { label: "Write a note", placeholder: "Write a note on this deal. It is kept in the CRM, and Sales reads it.", hint: "Kept on the deal in the CRM" },
};

/** The box at the bottom of the timeline, with its two ways: tell Sales, or write a note. */
export function DealComposer({ mode, onMode, onSend, inputRef }: { mode: Mode; onMode: (m: Mode) => void; onSend: (text: string) => void; inputRef: RefObject<ChatComposerInputHandle | null> }) {
  const way = WAYS[mode];
  return (
    <ChatComposer
      onSubmit={(text) => { if (text.trim() !== "") onSend(text.trim()); }}
      placeholder={way.placeholder}
      input={<ChatComposerInput handleRef={inputRef} label={way.label} />}
      headerContext={<Text type="supporting" color="secondary">{way.hint}</Text>}
      footerActions={
        <DropdownMenu
          button={{ label: way.label, variant: "ghost", size: "sm" }}
          items={(Object.keys(WAYS) as Mode[]).map((m) => ({ label: WAYS[m].label, onClick: () => onMode(m) }))}
        />
      }
    />
  );
}
