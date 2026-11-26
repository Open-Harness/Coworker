import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { ChatComposer } from "@astryxdesign/core/Chat";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { HStack } from "@astryxdesign/core/Layout";
import { PERSON, type Line, type Mode } from "./types";

/** The box at the bottom: tell the manager, or write to the other side as the manager. */
export function SendBox({ who, mode, onMode, onSend, about, isDisabled, disabledHint }: {
  who: string; mode: Mode; onMode: (m: Mode) => void; onSend: (text: string) => void; about: string; isDisabled?: boolean; disabledHint?: string;
}) {
  const label = mode === "tell" ? `Tell ${who}` : `Write as ${who}`;
  return (
    <ChatComposer
      placeholder={isDisabled ? (disabledHint ?? "") : mode === "tell" ? `Tell ${who} about this ${about}` : `Write as ${who}. It stays quiet after.`}
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

/** What sending adds to the stream: a quiet line for a told one, a message for a written one. */
export function sentLines(mode: Mode, who: string, text: string, n: number, wasYours: boolean): Line[] {
  const body = text.trim();
  if (mode === "tell") return [{ kind: "note", id: `s${n}`, text: `You told ${who}: ${body}` }];
  const take: Line[] = wasYours ? [] : [{ kind: "note", id: `s${n}t`, text: `${PERSON} took over` }];
  return [...take, { kind: "msg", id: `s${n}`, side: "me", time: "09:54", text: body, by: `${PERSON}, as ${who}` }];
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
