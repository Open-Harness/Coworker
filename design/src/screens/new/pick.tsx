import { useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { ChatComposer, ChatComposerInput, ChatDictationButton, useChatDictation, type ChatComposerInputHandle } from "@astryxdesign/core/Chat";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { go } from "../../shell";
import { madeFrom, TEMPLATES } from "./data";

/** Say it as in the first setup screen: one text box. Juno writes the rest of the steps from it. */
function Say() {
  const input = useRef<ChatComposerInputHandle>(null);
  const dictation = useChatDictation({ inputRef: input });
  const [said, setSaid] = useState("");
  return (
    <Card padding={5}>
      <VStack gap={4}>
        <VStack gap={1}><Heading level={2}>Say what you want to get to</Heading><Text type="supporting" color="secondary">As you would to a colleague. Juno asks the few things only you know, looks at how it has gone, and drafts a playbook.</Text></VStack>
        <ChatComposer value={said} onChange={(v: string) => setSaid(v)} onSubmit={() => go("setup")} placeholder="I want …" input={<ChatComposerInput handleRef={input} style={{ minHeight: 120 }} />} sendActions={<ChatDictationButton dictation={dictation} />} />
      </VStack>
    </Card>
  );
}

/** The same cards as the library, as a short list. */
function From() {
  return (
    <Card padding={5}>
      <VStack gap={4}>
        <VStack gap={1}><Heading level={2}>Start from a template</Heading><Text type="supporting" color="secondary">A playbook with blanks. You fill the blanks, and it is the same draft.</Text></VStack>
        <List density="balanced" hasDividers>
          {TEMPLATES.slice(0, 4).map((t) => (
            <ListItem key={t.id} label={t.name} description={`${t.connectors.join(", ")}. ${madeFrom(t)}`} onClick={() => go("new-fill")}
              endContent={<HStack gap={1.5} vAlign="center">{t.behind !== undefined && <Token size="sm" color="blue" label="Newer" />}<Button label="Use" aria-label={`Use ${t.name}`} size="sm" variant="secondary" onClick={() => go("new-fill")} /></HStack>} />
          ))}
        </List>
        <HStack><Button label="All templates" variant="ghost" onClick={() => go("set-templates")} /></HStack>
      </VStack>
    </Card>
  );
}

export function Pick() {
  return <Grid columns={{ minWidth: 340, max: 2 }} gap={5}><Say /><From /></Grid>;
}
