import { useCallback, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Load, useLoading } from "~/modules/team-core/service.ts";
import type { Loaded } from "~/modules/team-core/types.ts";
import { AddModelDialog, ChatGptDialog, SOURCE } from "~/modules/team-settings/service.ts";
import type { ModelData } from "~/modules/team-settings/types.ts";
import type { StepProps } from "../types.ts";
import { Wizard } from "./Wizard.tsx";

type Opened = "chatgpt" | "openai" | "endpoint";

const modelsOf = ({ models }: ModelData): string => (models.length === 0 ? "" : ` · ${models.slice(0, 2).join(", ")}`);

function Connected({ connections }: { readonly connections: readonly ModelData[] }) {
  if (connections.length === 0) return null;
  return (
    <Card padding={0}>
      <List hasDividers>
        {connections.map((model) => (
          <ListItem
            key={model.id}
            label={model.label === "" ? SOURCE[model.source].label : model.label}
            description={model.error ?? `The test call was answered${modelsOf(model)}`}
            endContent={
              <Badge
                variant={model.error === undefined ? "success" : "error"}
                label={model.error === undefined ? "Works" : "Not working"}
              />
            }
          />
        ))}
      </List>
    </Card>
  );
}

function AnthropicKey({ onAdd }: { readonly onAdd: (key: string) => Promise<Loaded<true>> }) {
  const [key, setKey] = useState("");
  const add = async () => {
    const result = await onAdd(key.trim());
    if (result._tag === "Loaded") setKey("");
  };
  return (
    <HStack gap={2} vAlign="end">
      <StackItem size="fill">
        <TextInput
          label="Anthropic API key"
          type="password"
          autoComplete="off"
          placeholder="sk-ant-…"
          value={key}
          onChange={setKey}
          width="100%"
        />
      </StackItem>
      <Button label="Add and test" isDisabled={key.trim() === ""} clickAction={add} />
    </HStack>
  );
}

/** Model access the workspace brings. Skippable; a manager waits for it. */
export function ConnectModel({ api, workspaceId, frame, next }: StepProps) {
  const { settings } = api;
  const { loaded, reload } = useLoading(useCallback(() => settings.keys(workspaceId), [settings, workspaceId]));
  const [open, setOpen] = useState<Opened>();
  const [failure, setFailure] = useState<string>();
  const close = () => setOpen(undefined);
  const after = async (asking: Promise<Loaded<true>>): Promise<Loaded<true>> => {
    const result = await asking;
    setFailure(result._tag === "Failed" ? result.message : undefined);
    reload();
    return result;
  };
  const isReady = loaded?._tag === "Loaded" && loaded.value.notReady === undefined;
  return (
    <Wizard
      frame={frame}
      title="Connect a model"
      description="Bring your own model access. You pay the provider; we never mark it up. Keys are stored in the vault, and agents never see them."
      failure={failure === undefined ? undefined : { title: "It can't be used yet", description: failure }}
      action={<Button label="Continue" variant="primary" isDisabled={!isReady} onClick={() => next({})} />}
      skip={isReady ? undefined : <Button label="Do this later" variant="ghost" onClick={() => next({})} />}
    >
      <AnthropicKey onAdd={(key) => after(settings.addModel(workspaceId, { source: "anthropic", key }))} />
      <Load loaded={loaded} failedTitle="Your keys did not load">
        {({ connections }) => <Connected connections={connections} />}
      </Load>
      <VStack gap={2}>
        <Text type="label">Or use</Text>
        <Card padding={0}>
          <List hasDividers>
            <ListItem label="Sign in with ChatGPT" description="Use your ChatGPT plan" onClick={() => setOpen("chatgpt")} />
            <ListItem label="An OpenAI, Google or OpenCode key" description="Tested before it is used" onClick={() => setOpen("openai")} />
            <ListItem
              label="Your own endpoint"
              description="Any OpenAI-compatible address, such as vLLM"
              onClick={() => setOpen("endpoint")}
            />
          </List>
        </Card>
        {!isReady && <Text type="supporting">You can do this later. Managers can't work until a model is connected.</Text>}
      </VStack>
      <ChatGptDialog
        isOpen={open === "chatgpt"}
        onClose={close}
        onStart={() => settings.startChatGpt(workspaceId)}
        onFinish={(url) => after(settings.finishChatGpt(workspaceId, url))}
      />
      {open !== undefined && open !== "chatgpt" && (
        <AddModelDialog isOpen initial={open} onClose={close} onAdd={(input) => after(settings.addModel(workspaceId, input))} />
      )}
    </Wizard>
  );
}
