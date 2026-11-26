import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Markdown } from "@astryxdesign/core/Markdown";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { PAGE } from "./data";
import { Note, useAccepted, useNotes } from "./notes";

/** The page the manager reads before anything else. Words, for an agent and for people. */
export function Page() {
  const { change, isDraft } = useNotes();
  const isAccepted = useAccepted("c1");
  const [own, setOwn] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const base = isAccepted || !isDraft ? PAGE.replace("Never two reminders in a week.", "At most two reminders in all. Then I tell Bo, and leave them alone.") : PAGE;
  const now = own ?? base;
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center" wrap="wrap">
        <StackItem size="fill"><Text type="supporting" color="secondary">{isDraft ? "Sales reads all of it. Each agent reads its own step." : "Version 6. Sales reads all of it, each agent its own step."}</Text></StackItem>
        <Note at="Never two reminders in a week" />
        {text === null ? <Button label="Edit" size="sm" variant="secondary" onClick={() => setText(now)} /> : <><Button label="Cancel" size="sm" variant="ghost" onClick={() => setText(null)} /><Button label="Keep" size="sm" variant="secondary" onClick={() => { setOwn(text); setText(null); change(); }} /></>}
      </HStack>
      {text === null ? <Markdown headingLevelStart={2}>{now}</Markdown> : <TextArea label="The playbook" isLabelHidden rows={26} value={text} onChange={(v: string) => setText(v)} />}
    </VStack>
  );
}
