import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Table, type TableColumn } from "@astryxdesign/core/Table";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { AgentRow, Deployment } from "~/modules/agent-config/types.ts";
import { useDirectory, useReport, useSession } from "~/modules/app/service.ts";
import { Page } from "~/modules/ui/service.ts";
import { adminLinks } from "./links.ts";
import { placeNames, sessionsOf } from "./names.ts";
import { useDeploying } from "./useDeploying.tsx";

type Row = { readonly id: string; readonly agent: AgentRow; readonly deployment: Deployment };

/** What people can use right now. */
export function DeploymentsScreen() {
  const { directory } = useSession();
  const { agents, workspaces } = useDirectory();
  const report = useReport();
  const deploying = useDeploying();
  const rows = agents.flatMap((agent): Row[] =>
    agent.deployment === undefined ? [] : [{ id: agent.id, agent, deployment: agent.deployment }],
  );
  const columns: TableColumn<Row>[] = [
    { key: "name", header: "Agent", renderCell: ({ id, deployment }) => <Link href={adminLinks.agent(id)}>{deployment.name}</Link> },
    { key: "version", header: "Version", renderCell: ({ deployment }) => `v${deployment.version}` },
    { key: "to", header: "Where", renderCell: ({ deployment }) => placeNames(deployment.to, workspaces) },
    { key: "sessions", header: "Sessions", renderCell: ({ id }) => String(sessionsOf(id, workspaces)) },
    { key: "by", header: "Deployed by", renderCell: ({ deployment }) => deployment.by },
    { key: "at", header: "Since", renderCell: ({ deployment }) => <Timestamp value={deployment.at / 1000} format="relative" /> },
    {
      key: "actions",
      header: "",
      align: "end",
      renderCell: ({ id, agent }) => (
        <HStack gap={2} hAlign="end">
          <Button label="Change" size="sm" onClick={() => deploying.ask(agent)} />
          <Button label="Stop" size="sm" variant="ghost" onClick={() => void report(directory.retireAgent(id))} />
        </HStack>
      ),
    },
  ];
  return (
    <Page title="Deployments" description="The agents people can start a chat with." width="wide">
      <Table
        data={rows}
        columns={columns}
        idKey="id"
        hasHover
        emptyState={<EmptyState title="Nothing is deployed" description="Open an agent and deploy a version of it." />}
      />
      {deploying.element}
    </Page>
  );
}
