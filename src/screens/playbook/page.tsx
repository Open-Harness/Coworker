import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Markdown } from "@astryxdesign/core/Markdown";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Note, useNotes } from "./notes.tsx";

/** What the accepted changes of a part do to a text: each one's old words become its new. */
export function useChanged(part: string, text: string, line?: string): string {
  const { comments, said } = useNotes();
  return comments
    .filter((c) => c.part === part && said[c.id] === "accepted" && c.change !== null && (line === undefined || c.line === line))
    .reduce((now, c) => (c.change !== null && c.change.was !== "" ? now.replace(c.change.was, c.change.now) : now), text);
}

/** The page the manager reads before anything else. Words, for an agent and for people. */
export function Page() {
  const { change, isDraft, view, comments } = useNotes();
  const [own, setOwn] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const base = useChanged("Playbook", view.playbook.page);
  const now = own ?? base;
  const name = view.playbook.name;
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <Text type="supporting" color="secondary">
            {isDraft
              ? `${name} reads all of it. Each agent reads its own step.`
              : `Version ${view.version}. ${name} reads all of it, each agent its own step.`}
          </Text>
        </StackItem>
        <Note at={comments.find((c) => c.part === "Playbook")?.on ?? name} />
        {text === null ? (
          <Button label="Edit" size="sm" variant="secondary" onClick={() => setText(now)} />
        ) : (
          <>
            <Button label="Cancel" size="sm" variant="ghost" onClick={() => setText(null)} />
            <Button
              label="Keep"
              size="sm"
              variant="secondary"
              onClick={() => {
                setOwn(text);
                setText(null);
                change();
              }}
            />
          </>
        )}
      </HStack>
      {text === null ? (
        <Markdown headingLevelStart={2}>{now}</Markdown>
      ) : (
        <TextArea label="The playbook" isLabelHidden rows={26} value={text} onChange={(v: string) => setText(v)} />
      )}
    </VStack>
  );
}
