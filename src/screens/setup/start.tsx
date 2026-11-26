// astryx-template: form-wizard-vertical
import { useRef, useState } from "react";
import {
  ChatComposer,
  ChatComposerInput,
  ChatDictationButton,
  useChatDictation,
  type ChatComposerInputHandle,
} from "@astryxdesign/core/Chat";
import { Card } from "@astryxdesign/core/Card";
import { VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";

/** Says it so that it can be measured, and the co-worker writes the rest of the steps from it. */
export function Start({ onSay }: { onSay: (said: string) => void }) {
  const input = useRef<ChatComposerInputHandle>(null);
  const dictation = useChatDictation({ inputRef: input });
  const [said, setSaid] = useState("");
  return (
    <ChatComposer
      value={said}
      onChange={(v: string) => setSaid(v)}
      onSubmit={() => said.trim() !== "" && onSay(said.trim())}
      placeholder="I want …"
      input={<ChatComposerInput handleRef={input} style={{ minHeight: 120 }} />}
      sendActions={<ChatDictationButton dictation={dictation} />}
    />
  );
}
export function Back({ heard, who }: { heard: string; who: string }) {
  return (
    <Card variant="muted" padding={4}>
      <VStack gap={1}>
        <Text type="label">{who} heard</Text>
        <Text type="body">{heard}</Text>
      </VStack>
    </Card>
  );
}
