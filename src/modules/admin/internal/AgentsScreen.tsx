import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { AgentRow } from "~/modules/agent-config/types.ts";
import { useDirectory } from "~/modules/app/service.ts";
import type { ModelOption } from "~/modules/protocol/types.ts";
import { Page } from "~/modules/ui/service.ts";
import { adminLinks } from "./links.ts";
import { isBehind, modelName, toolNames } from "./names.ts";

export function DeploymentBadge({ agent }: { readonly agent: AgentRow }) {
  if (agent.deployment === undefined) return <Badge label="Draft" />;
  return isBehind(agent) ? (
    <Badge variant="warning" label={`v${agent.deployment.version} deployed`} />
  ) : (
    <Badge variant="success" label="Deployed" />
  );
}

const columns = (models: readonly ModelOption[]): TableColumn<AgentRow & Record<string, unknown>>[] => [
  {
    key: "name",
    header: "Agent",
    width: proportional(2),
    renderCell: ({ id, config }) => (
      <VStack gap={0}>
        <Link href={adminLinks.agent(id)}>{config.name}</Link>
        <Text type="supporting" color="secondary" maxLines={1}>
          {config.description}
        </Text>
      </VStack>
    ),
  },
  { key: "model", header: "Model", renderCell: ({ config }) => modelName(config.model, models) },
  { key: "tools", header: "Tools", renderCell: ({ config }) => toolNames(config.tools) },
  { key: "version", header: "Version", renderCell: ({ version }) => `v${version}` },
  { key: "status", header: "Status", renderCell: (agent) => <DeploymentBadge agent={agent} /> },
  {
    key: "saved",
    header: "Saved",
    renderCell: ({ versions, createdAt }) => <Timestamp value={(versions[0]?.savedAt ?? createdAt) / 1000} format="relative" />,
  },
];

/** Every agent, deployed or not. */
export function AgentsScreen() {
  const { agents, models } = useDirectory();
  return (
    <Page
      title="Agents"
      description="Each agent has a prompt, a model and tools. People can use the ones you deploy."
      width="wide"
      endContent={<Button label="New agent" variant="primary" href={adminLinks.create} />}
    >
      <Table
        data={agents as (AgentRow & Record<string, unknown>)[]}
        columns={columns(models)}
        idKey="id"
        hasHover
        emptyState={<EmptyState title="No agents yet" description="Describe one or start from a template." />}
      />
    </Page>
  );
}
