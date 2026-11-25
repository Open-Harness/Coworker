import { useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { useRouter } from "@tanstack/react-router";
import { Center } from "@astryxdesign/core/Center";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import type { ModelRef, ThinkingLevel, WorkspaceRow } from "~/modules/protocol/types.ts";
import { PromptComposer, SuggestionPicker } from "~/modules/ui/service.ts";
import type { WorkspaceClient } from "~/modules/manager-client/types.ts";
import type { LandingProps, Session } from "../types.ts";
import { useDirectory, useDraft, useReport, useWorkspace, useWorkspaceState } from "./hooks.ts";
import { links } from "./links.ts";
import { AgentChoice, agentsIn, WorkspaceChoice } from "./StartChoices.tsx";
import { useSession } from "./page-context.ts";
import { suggestions } from "./suggestions.ts";

const FIRST_WORKSPACE = "General";
type Choice = { readonly model?: ModelRef; readonly thinkingLevel?: ThinkingLevel };

/** Starts a chat and says the first thing in it. Returns its address. */
async function startChat(
  session: Session,
  report: ReturnType<typeof useReport>,
  {
    workspaceId,
    agentId,
    choice,
    content,
  }: { workspaceId: string | undefined; agentId: string | undefined; choice: Choice; content: string },
): Promise<string | undefined> {
  const target = workspaceId ?? (await report(session.directory.createWorkspace(FIRST_WORKSPACE)));
  if (target === undefined) return undefined;
  const chatId = await report(session.directory.createChat(target, agentId));
  if (chatId === undefined) return undefined;
  const client = session.workspaces.select(target);
  if (agentId === undefined && (choice.model !== undefined || choice.thinkingLevel !== undefined))
    await report(client.configure(chatId, choice));
  void report(client.submit(chatId, content, "followUp"));
  return links.chat(target, chatId);
}

const Greeting = ({ name }: { readonly name: string }) => (
  <VStack gap={1}>
    <HStack gap={2} vAlign="center">
      <Icon icon={SparklesIcon} size="md" color="accent" />
      <Text type="large" as="h2">
        {`Hi, ${name.split(" ")[0]}`}
      </Text>
    </HStack>
    <Text type="display-2" as="h1">
      Where should we start?
    </Text>
  </VStack>
);

/** What new chats of a workspace start with, as far as the page knows. */
function useDefaults(client: WorkspaceClient | undefined): Choice {
  const settings = useWorkspaceState(client, ({ workspace }) => workspace?.settings);
  const { models } = useDirectory();
  const model = settings?.model ?? models[0];
  return { thinkingLevel: settings?.thinkingLevel ?? "off", ...(model === undefined ? {} : { model }) };
}

const usable = (workspaces: readonly WorkspaceRow[]) => workspaces.filter(({ archivedAt }) => archivedAt === undefined);

function StartComposer({
  workspaceId,
  prompt,
}: {
  readonly workspaceId: string | undefined;
  readonly prompt: ReturnType<typeof useDraft>;
}) {
  const session = useSession();
  const { workspaces, models, agents } = useDirectory();
  const router = useRouter();
  const report = useReport();
  const [picked, setPicked] = useState(workspaceId);
  const [agentId, setAgentId] = useState<string>();
  const [choice, setChoice] = useState<Choice>({});
  const [isStarting, setIsStarting] = useState(false);
  const [draft, setDraft] = prompt;
  const target = picked ?? usable(workspaces)[0]?.id;
  const offered = agentsIn(agents, target);
  // Retired or not deployed there: back to the assistant.
  const agent = offered.find(({ id }) => id === agentId);
  const defaults = useDefaults(useWorkspace(target));
  const start = async (content: string) => {
    if (content.trim() === "" || isStarting) return;
    setIsStarting(true);
    const address = await startChat(session, report, { workspaceId: target, agentId: agent?.id, choice, content: content.trim() });
    setIsStarting(false);
    if (address === undefined) return setDraft(content);
    setDraft("");
    router.history.push(address);
  };
  return (
    <PromptComposer
      value={draft}
      onChange={setDraft}
      onSubmit={(content) => void start(content)}
      placeholder={agent === undefined ? "Ask anything" : `Ask ${agent.deployment?.name}`}
      isDisabled={isStarting}
      documents={workspaces.find(({ id }) => id === target)?.documents ?? []}
      models={models}
      thinkingLevel="off"
      {...defaults}
      {...choice}
      onConfigure={(change) => setChoice({ ...choice, ...change })}
      isModelFixed={agent !== undefined}
      extraActions={
        <>
          <WorkspaceChoice workspaces={usable(workspaces)} value={target} onChange={setPicked} />
          <AgentChoice agents={offered} value={agent?.id} onChange={setAgentId} />
        </>
      }
    />
  );
}

/** Where a new chat begins. */
export function Landing({ workspaceId }: LandingProps) {
  const { me } = useSession();
  const { loaded } = useDirectory();
  const prompt = useDraft(`new ${workspaceId ?? ""}`);
  return (
    <Layout
      height="fill"
      contentWidth={720}
      padding={6}
      content={
        <LayoutContent>
          <Center axis="vertical" minHeight="100%">
            <VStack gap={8} width="100%">
              <Greeting name={me.name} />
              {loaded && <StartComposer key={workspaceId} workspaceId={workspaceId} prompt={prompt} />}
              <SuggestionPicker categories={suggestions} onPick={prompt[1]} />
            </VStack>
          </Center>
        </LayoutContent>
      }
    />
  );
}
