import { useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Code } from "@astryxdesign/core/Code";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import type { Loaded } from "~/modules/team-core/types.ts";
import { Page, PageSection } from "~/modules/ui/service.ts";
import type { EnvironmentData, SaveEnvironment, SecretData, TestData } from "../types.ts";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import { DataTable } from "./DataTable.tsx";
import { EnvironmentDialog } from "./EnvironmentDialog.tsx";
import { SecretDialog } from "./SecretDialog.tsx";
import { SecretsList } from "./SecretsList.tsx";
import { TestStartDialog } from "./TestStartDialog.tsx";

export interface EnvironmentsScreenProps {
  readonly environments: readonly EnvironmentData[];
  readonly onSave: (input: SaveEnvironment) => Promise<Loaded<true>>;
  readonly onAssign: (agent: string, environmentId: string | undefined) => Promise<boolean>;
  readonly onSecret: (name: string, value: string) => Promise<Loaded<true>>;
  readonly onDelete: (environment: EnvironmentData) => Promise<Loaded<readonly string[]>>;
  readonly onTest: (environmentId: string) => Promise<Loaded<TestData>>;
  /** Agents an environment can be given to. */
  readonly agents: readonly string[];
  readonly secrets: readonly SecretData[];
  readonly onRemoveSecret: (name: string) => Promise<Loaded<readonly string[]>>;
}

const STATUS = {
  Ready: { variant: "success", label: "Ready" },
  Failed: { variant: "error", label: "Setup failed" },
  "Not started": { variant: "neutral", label: "Not started yet" },
} as const;

function Script({ environment }: { readonly environment: EnvironmentData }) {
  return (
    <PageSection title={`${environment.name} · setup script`}>
      <VStack gap={2}>
        <CodeBlock
          code={environment.setup === "" ? "# Nothing: agents start from the plain container" : environment.setup}
          language="bash"
          title={`Version ${environment.version}`}
          hasLanguageLabel={false}
          width="100%"
        />
        {environment.output !== undefined && (
          <CodeBlock code={environment.output} title="What it printed when it failed" hasLanguageLabel={false} width="100%" isWrapped />
        )}
        <Text type="supporting">
          {"A line such as "}
          <Code>export NPM_TOKEN=vault:npm</Code>
          {" names a secret. The value never reaches the script."}
        </Text>
      </VStack>
    </PageSection>
  );
}

/** Where agents do their work: what a container starts with, how big it is, and which agents use it. */
export function EnvironmentsScreen({
  environments,
  onSave,
  onAssign,
  onSecret,
  onDelete,
  onTest,
  agents,
  secrets,
  onRemoveSecret,
}: EnvironmentsScreenProps) {
  const [editing, setEditing] = useState<EnvironmentData | "new">();
  const [isAddingSecret, setIsAddingSecret] = useState(false);
  const [testing, setTesting] = useState<EnvironmentData>();
  const [deleting, setDeleting] = useState<EnvironmentData>();
  const [shownId, setShownId] = useState<string>();
  const shown = environments.find(({ id }) => id === shownId) ?? environments[0];
  return (
    <Page
      width="wide"
      title="Environments"
      description="Each run gets a container that starts from one of these. The setup runs once per version and is kept."
      endContent={
        <HStack gap={2} wrap="wrap">
          <Button label="Add a secret" onClick={() => setIsAddingSecret(true)} />
          <Button label="New environment" variant="primary" onClick={() => setEditing("new")} />
        </HStack>
      }
    >
      <DataTable
        stacked
        items={environments}
        idOf={({ id }) => id}
        empty="No environments yet"
        columns={[
          {
            header: "Environment",
            cell: (environment) => (
              <VStack gap={0}>
                <Text weight="medium">{environment.name}</Text>
                <Text type="supporting">{`Version ${environment.version}`}</Text>
              </VStack>
            ),
          },
          { header: "Size", width: 150, cell: ({ size }) => <Text color="secondary">{size}</Text> },
          {
            header: "Used by",
            cell: ({ usedBy }) =>
              usedBy.length === 0 ? (
                <Text color="secondary">No agent yet</Text>
              ) : (
                <HStack gap={1} wrap="wrap">
                  {usedBy.map((agent) => (
                    <Token key={agent} label={agent} size="sm" onRemove={() => void onAssign(agent, undefined)} />
                  ))}
                </HStack>
              ),
          },
          { header: "Status", width: 160, cell: ({ status }) => <Badge {...STATUS[status]} /> },
          {
            header: "",
            width: 200,
            align: "end",
            cell: (environment) => (
              <HStack gap={1} hAlign="end" vAlign="center">
                <Button
                  label="Test start"
                  size="sm"
                  variant="ghost"
                  aria-label={`Test start of ${environment.name}`}
                  onClick={() => setTesting(environment)}
                />
                <Button
                  label="Edit"
                  size="sm"
                  variant="ghost"
                  aria-label={`Edit ${environment.name}`}
                  onClick={() => setEditing(environment)}
                />
                <MoreMenu
                  label={`More for ${environment.name}`}
                  size="sm"
                  alignment="end"
                  items={[
                    { label: "Show setup script", onClick: () => setShownId(environment.id) },
                    { label: "Delete", onClick: () => setDeleting(environment) },
                  ]}
                />
              </HStack>
            ),
          },
        ]}
      />
      {shown !== undefined && <Script environment={shown} />}
      <PageSection title="Secrets">
        <Text type="supporting">Setup scripts name them as vault:name. A value is never shown again.</Text>
        <SecretsList secrets={secrets} onRemove={onRemoveSecret} />
      </PageSection>
      {testing !== undefined && <TestStartDialog environment={testing} onClose={() => setTesting(undefined)} onTest={onTest} />}
      <ConfirmDialog
        isOpen={deleting !== undefined}
        title={`Delete ${deleting?.name ?? ""}?`}
        description={
          deleting === undefined || deleting.usedBy.length === 0
            ? "Its setup and size are deleted. Nothing runs here at the moment."
            : `Its setup and size are deleted. ${deleting.usedBy.join(", ")} will run in the plain container until they are given another environment.`
        }
        actionLabel="Delete environment"
        onClose={() => setDeleting(undefined)}
        onConfirm={() =>
          deleting === undefined ? Promise.resolve<Loaded<readonly string[]>>({ _tag: "Loaded", value: [] }) : onDelete(deleting)
        }
      />
      {editing !== undefined && (
        <EnvironmentDialog
          environment={editing === "new" ? undefined : editing}
          onClose={() => setEditing(undefined)}
          onSave={onSave}
          onAssign={onAssign}
          agents={agents}
        />
      )}
      <SecretDialog isOpen={isAddingSecret} onClose={() => setIsAddingSecret(false)} onSave={onSecret} />
    </Page>
  );
}
