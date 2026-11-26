import { useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack, Stack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { useNarrow } from "~/modules/team-core/service.ts";
import type { Loaded } from "~/modules/team-core/types.ts";
import { Page, PageSection } from "~/modules/ui/service.ts";
import type { GitHubData, KeysData, NewModel, SecretData } from "../types.ts";
import { AddModelDialog } from "./AddModelDialog.tsx";
import { ChatGptDialog } from "./ChatGptDialog.tsx";
import { type ModelActions, ModelsTable } from "./ModelsTable.tsx";
import { SecretDialog } from "./SecretDialog.tsx";
import { SecretsList } from "./SecretsList.tsx";

export interface KeysScreenProps {
  readonly keys: KeysData;
  readonly gitHub: GitHubData;
  readonly onAdd: (input: NewModel) => Promise<Loaded<true>>;
  /** Goes to a page outside the app, such as GitHub's. */
  readonly onLeave: (url: string) => void;
  readonly onStartChatGpt: () => Promise<Loaded<string>>;
  readonly onFinishChatGpt: (redirectUrl: string) => Promise<Loaded<true>>;
  readonly on: ModelActions;
  readonly secrets: readonly SecretData[];
  readonly onAddSecret: (name: string, value: string) => Promise<Loaded<true>>;
  readonly onRemoveSecret: (name: string) => Promise<Loaded<readonly string[]>>;
}

function GitHub({ gitHub, onLeave }: { readonly gitHub: GitHubData; readonly onLeave: (url: string) => void }) {
  const { account, repos, installUrl } = gitHub;
  const isNarrow = useNarrow();
  return (
    <Card padding={5}>
      <Stack direction={isNarrow ? "vertical" : "horizontal"} gap={4} vAlign="center">
        <StackItem size="fill">
          <VStack gap={0}>
            <Text weight="medium">GitHub</Text>
            <Text type="supporting">
              {account === undefined
                ? "The GitHub App is not installed on an account yet."
                : `${account} · ${repos.length} ${repos.length === 1 ? "repository" : "repositories"}`}
            </Text>
          </VStack>
        </StackItem>
        <HStack gap={4} vAlign="center">
          {installUrl !== undefined && (
            <Button label={account === undefined ? "Connect GitHub" : "Change on GitHub"} onClick={() => onLeave(installUrl)} />
          )}
          <Badge variant={account === undefined ? "neutral" : "success"} label={account === undefined ? "Not connected" : "Connected"} />
        </HStack>
      </Stack>
    </Card>
  );
}

/** The workspace's own model access, and what else it is connected to. Keys are never shown again. */
export function KeysScreen({
  keys,
  gitHub,
  onAdd,
  onLeave,
  onStartChatGpt,
  onFinishChatGpt,
  on,
  secrets,
  onAddSecret,
  onRemoveSecret,
}: KeysScreenProps) {
  const [open, setOpen] = useState<"key" | "chatgpt" | "secret">();
  return (
    <Page
      width="wide"
      title="Keys and connections"
      description="Models run on your own keys and sign-ins. A key is stored in the vault and never shown again."
      endContent={
        <HStack gap={2} wrap="wrap">
          <Button label="Add a secret" onClick={() => setOpen("secret")} />
          <Button label="Sign in to ChatGPT" onClick={() => setOpen("chatgpt")} />
          <Button label="Add a key" variant="primary" onClick={() => setOpen("key")} />
        </HStack>
      }
    >
      {keys.notReady !== undefined && <Banner status="warning" title="No manager can start yet" description={keys.notReady} />}
      <PageSection title="Models">
        <ModelsTable connections={keys.connections} on={on} />
      </PageSection>
      <PageSection title="Connections">
        <GitHub gitHub={gitHub} onLeave={onLeave} />
      </PageSection>
      <PageSection title="Secrets">
        <Text type="supporting">Setup scripts use these by name. A value is never shown again.</Text>
        <SecretsList secrets={secrets} onRemove={onRemoveSecret} />
      </PageSection>
      <AddModelDialog isOpen={open === "key"} onClose={() => setOpen(undefined)} onAdd={onAdd} />
      <SecretDialog isOpen={open === "secret"} onClose={() => setOpen(undefined)} onSave={onAddSecret} />
      <ChatGptDialog isOpen={open === "chatgpt"} onClose={() => setOpen(undefined)} onStart={onStartChatGpt} onFinish={onFinishChatGpt} />
    </Page>
  );
}
