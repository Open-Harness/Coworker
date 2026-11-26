import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { ChatComposer } from "@astryxdesign/core/Chat";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { useState } from "react";

export type Way = "tell" | "write";

/** The box at the bottom: "Tell Coding" goes to the manager and GitHub never sees it; "Write as Juno" is a comment on GitHub. */
export function Box({
  who,
  managerName,
  onTell,
  onWrite,
}: {
  who: string;
  managerName: string;
  onTell: (text: string) => void;
  onWrite: (text: string) => void;
}) {
  const [way, setWay] = useState<Way>("tell");
  return (
    <VStack paddingInline={4} paddingBlock={3}>
      <ChatComposer
        onSubmit={(text) => {
          const t = text.trim();
          if (t) (way === "tell" ? onTell : onWrite)(t);
        }}
        placeholder={
          way === "tell"
            ? `Tell ${managerName} about this. GitHub does not see it.`
            : `Write a comment as ${who}. ${managerName} stays quiet here until you hand it back.`
        }
        footerActions={
          <DropdownMenu
            button={{ label: way === "tell" ? `Tell ${managerName}` : `Write as ${who}`, variant: "ghost", size: "sm" }}
            items={[
              { label: `Tell ${managerName}`, onClick: () => setWay("tell") },
              { label: `Write as ${who}`, onClick: () => setWay("write") },
            ]}
          />
        }
      />
    </VStack>
  );
}

/** Header mark while a person has this one. */
export function Yours({ onBack }: { onBack: () => void }) {
  return (
    <HStack gap={2} vAlign="center">
      <Badge label="Yours" variant="neutral" />
      <Button label="Hand back" variant="secondary" size="sm" onClick={onBack} />
    </HStack>
  );
}
