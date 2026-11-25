import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useImperativeAlertDialog } from "@astryxdesign/core/AlertDialog";
import { Banner } from "@astryxdesign/core/Banner";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Heading } from "@astryxdesign/core/Text";
import { Selector } from "@astryxdesign/core/Selector";
import { BLANK_AGENT, checkAgentConfig } from "~/modules/agent-config/service.ts";
import type { AgentConfig, AgentRow } from "~/modules/agent-config/types.ts";
import { Gone, useDirectory, useReport, useSession } from "~/modules/app/service.ts";
import { Page } from "~/modules/ui/service.ts";
import type { AgentScreenProps, NewAgentScreenProps } from "../types.ts";
import { ConfigForm } from "./ConfigForm.tsx";
import { ConfigText } from "./ConfigText.tsx";
import { adminLinks } from "./links.ts";
import { isBehind, placeNames } from "./names.ts";
import { templates } from "./templates.ts";
import { useDeploying } from "./useDeploying.tsx";

function ConfigEditor({ config, onChange }: { readonly config: AgentConfig; readonly onChange: (config: AgentConfig) => void }) {
  const { models } = useDirectory();
  const [shape, setShape] = useState("form");
  return (
    <VStack gap={6}>
      <HStack hAlign="between" vAlign="center">
        <Heading level={2}>Agent config</Heading>
        <SegmentedControl label="Show the config as" size="sm" value={shape} onChange={setShape}>
          <SegmentedControlItem value="form" label="Form" />
          <SegmentedControlItem value="yaml" label="YAML" />
        </SegmentedControl>
      </HStack>
      {shape === "form" ? (
        <ConfigForm config={config} models={models} onChange={onChange} />
      ) : (
        <ConfigText config={config} onChange={onChange} />
      )}
    </VStack>
  );
}

const Trail = ({ name }: { readonly name: string }) => (
  <Breadcrumbs>
    <BreadcrumbItem href={adminLinks.agents}>Agents</BreadcrumbItem>
    <BreadcrumbItem isCurrent>{name}</BreadcrumbItem>
  </Breadcrumbs>
);

/** An agent nobody saved yet. */
export function NewAgentScreen({ template, draft }: NewAgentScreenProps) {
  const { directory } = useSession();
  const report = useReport();
  const router = useRouter();
  const [config, setConfig] = useState<AgentConfig>(() => {
    const drafted = checkAgentConfig(draft);
    return drafted.ok ? drafted.value : (templates.find(({ key }) => key === template)?.config ?? BLANK_AGENT);
  });
  const create = async () => {
    const id = await report(directory.saveAgent(config));
    if (id !== undefined) router.history.replace(adminLinks.agent(id));
  };
  return (
    <Page
      trail={<Trail name="New agent" />}
      title="Create agent"
      description="Saved agents are drafts until you deploy them."
      endContent={<Button label="Create agent" variant="primary" isDisabled={!checkAgentConfig(config).ok} onClick={() => void create()} />}
    >
      <ConfigEditor config={config} onChange={setConfig} />
    </Page>
  );
}

function AgentMenu({ agent }: { readonly agent: AgentRow }) {
  const { directory } = useSession();
  const report = useReport();
  const router = useRouter();
  const confirm = useImperativeAlertDialog();
  const remove = () =>
    confirm.show({
      title: `Delete ${agent.config.name}?`,
      description: "Nobody can start a chat with it any more. Chats it already answers go on.",
      actionLabel: "Delete",
      onAction: () => {
        confirm.hide();
        router.history.push(adminLinks.agents);
        void report(directory.deleteAgent(agent.id));
      },
    });
  return (
    <>
      <MoreMenu
        label="Agent options"
        items={[
          ...(agent.deployment === undefined
            ? []
            : [{ label: "Stop the deployment", onClick: () => void report(directory.retireAgent(agent.id)) }]),
          { label: "Delete", onClick: remove },
        ]}
      />
      {confirm.element}
    </>
  );
}

function deploymentNote(agent: AgentRow, places: string): string {
  if (agent.deployment === undefined) return "Not deployed: people cannot use it yet.";
  const behind = isBehind(agent) ? ` Version ${agent.version} is not deployed.` : "";
  return `Version ${agent.deployment.version} is deployed to ${places.toLowerCase()}.${behind}`;
}

interface Base {
  readonly version: number;
  readonly config: AgentConfig;
}

function Editor({ agent }: { readonly agent: AgentRow }) {
  const { directory } = useSession();
  const { workspaces } = useDirectory();
  const report = useReport();
  const deploying = useDeploying();
  const [base, setBase] = useState<Base>({ version: agent.version, config: agent.config });
  const [config, setConfig] = useState(agent.config);
  const isChanged = JSON.stringify(config) !== JSON.stringify(base.config);
  const newest = agent.versions[0];
  const save = async () => {
    const saved = await report(directory.saveAgent(config, { id: agent.id, version: base.version }));
    if (saved !== undefined) setBase({ version: base.version + 1, config });
  };
  const load = async (version: number) => {
    const loaded = await report(directory.readAgent(agent.id, version));
    if (loaded !== undefined) setConfig(loaded);
  };
  const catchUp = () => {
    setBase({ version: agent.version, config: agent.config });
    setConfig(agent.config);
  };
  return (
    <Page
      trail={<Trail name={agent.config.name} />}
      title={agent.config.name}
      description={deploymentNote(agent, agent.deployment === undefined ? "" : placeNames(agent.deployment.to, workspaces))}
      endContent={
        <HStack gap={2} vAlign="center">
          <Selector
            label="Version"
            isLabelHidden
            variant="ghost"
            size="sm"
            options={agent.versions.map(({ version, savedBy }) => ({ value: String(version), label: `v${version}`, description: savedBy }))}
            value={String(base.version)}
            onChange={(version) => void load(Number(version))}
          />
          <Button label="Save" isDisabled={!isChanged || !checkAgentConfig(config).ok} onClick={() => void save()} />
          <Button label="Deploy" variant="primary" isDisabled={isChanged} onClick={() => deploying.ask(agent)} />
          <AgentMenu agent={agent} />
        </HStack>
      }
    >
      {newest !== undefined && newest.version > base.version && (
        <Banner
          status="warning"
          title={`${newest.savedBy} saved version ${newest.version}`}
          endContent={<Button label="Load it" size="sm" onClick={catchUp} />}
        />
      )}
      <ConfigEditor config={config} onChange={setConfig} />
      {deploying.element}
    </Page>
  );
}

/** One agent: its config, its versions, and whether people can use it. */
export function AgentScreen({ agentId }: AgentScreenProps) {
  const { agents } = useDirectory();
  const agent = agents.find(({ id }) => id === agentId);
  return agent === undefined ? <Gone kind="agent" /> : <Editor agent={agent} />;
}
