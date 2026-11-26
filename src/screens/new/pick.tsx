// astryx-template: form-wizard
import { useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import {
  ChatComposer,
  ChatComposerInput,
  ChatDictationButton,
  useChatDictation,
  type ChatComposerInputHandle,
} from "@astryxdesign/core/Chat";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { useToast } from "@astryxdesign/core/Toast";
import { Reading, useApi, useGo, useRead } from "~/modules/page/service.ts";
import { isBehind, madeFrom, nameOf } from "./templates.ts";

/** Say it as in the first setup screen: one text box. The co-worker writes the rest of the steps from it. */
function Say({ who }: { readonly who: string }) {
  const input = useRef<ChatComposerInputHandle>(null);
  const dictation = useChatDictation({ inputRef: input });
  const [said, setSaid] = useState("");
  const [api, go, showToast] = [useApi(), useGo(), useToast()];
  const send = async () => {
    if (said.trim() === "") return;
    const walked = await api.write("/set-up", { said: said.trim() });
    if (walked._tag === "Ok") go(`/set-up/${walked.value.walk}`);
    else showToast({ body: `That did not go through. ${walked.says}`, uniqueID: "say-failed" });
  };
  return (
    <Card padding={5}>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={2}>Say what you want to get to</Heading>
          <Text type="supporting" color="secondary">
            As you would to a colleague. {who} asks the few things only you know, looks at how it has gone, and drafts a playbook.
          </Text>
        </VStack>
        <ChatComposer
          value={said}
          onChange={(v: string) => setSaid(v)}
          onSubmit={() => void send()}
          placeholder="I want …"
          input={<ChatComposerInput handleRef={input} style={{ minHeight: 120 }} />}
          sendActions={<ChatDictationButton dictation={dictation} />}
        />
      </VStack>
    </Card>
  );
}

/** The same cards as the library, as a short list. */
function From() {
  const go = useGo();
  const names = useRead("/settings/connectors");
  const connectors = names._tag === "Ok" ? names.value.connectors : [];
  return (
    <Reading from="/templates" failed="We could not read the templates">
      {({ templates }) => (
        <Card padding={5}>
          <VStack gap={4}>
            <VStack gap={1}>
              <Heading level={2}>Start from a template</Heading>
              <Text type="supporting" color="secondary">
                A playbook with blanks. You fill the blanks, and it is the same draft.
              </Text>
            </VStack>
            <List density="balanced" hasDividers>
              {templates.slice(0, 4).map((t) => (
                <ListItem
                  key={t.id}
                  label={t.name}
                  description={`${t.needs.map((n) => nameOf(connectors, n)).join(", ")}. ${madeFrom(t)}`}
                  onClick={() => go(`/managers/new/${t.id}`)}
                  endContent={
                    <HStack gap={1.5} vAlign="center">
                      {isBehind(t) && <Token size="sm" color="blue" label="Newer" />}
                      <Button
                        label="Use"
                        aria-label={`Use ${t.name}`}
                        size="sm"
                        variant="secondary"
                        onClick={() => go(`/managers/new/${t.id}`)}
                      />
                    </HStack>
                  }
                />
              ))}
            </List>
            <HStack>
              <Button label="All templates" variant="ghost" onClick={() => go("/settings/templates")} />
            </HStack>
          </VStack>
        </Card>
      )}
    </Reading>
  );
}

export function Pick({ who }: { readonly who: string }) {
  return (
    <Grid columns={{ minWidth: 340, max: 2 }} gap={5}>
      <Say who={who} />
      <From />
    </Grid>
  );
}
