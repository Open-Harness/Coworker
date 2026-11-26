import { useState } from "react";
import { ChatComposer, ChatComposerInput } from "@astryxdesign/core/Chat";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { VStack } from "@astryxdesign/core/Layout";

export type Way = "tell" | "write";

/**
 * The box at the bottom of the pane, two ways in: "Tell Juno" goes to the manager about this conversation and the customer does not see it;
 * "Write as Juno" goes to the customer, and the manager stays quiet in this conversation until you hand it back.
 */
export function ReplyBox({
  who,
  first,
  onTell,
  onWrite,
}: {
  who: string;
  first: string;
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
            ? `Tell ${who} about this conversation. The customer does not see it.`
            : `Write to ${first}. ${who} stays quiet until you hand it back.`
        }
        input={<ChatComposerInput />}
        footerActions={
          <DropdownMenu
            button={{ label: way === "tell" ? `Tell ${who}` : `Write as ${who}`, variant: "ghost", size: "sm" }}
            items={[
              { label: `Tell ${who}`, onClick: () => setWay("tell") },
              { label: `Write as ${who}`, onClick: () => setWay("write") },
            ]}
          />
        }
      />
    </VStack>
  );
}
